const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * RPC FETCHER - Fetch public RPCs from chainlist.org
 *
 * 3-layer cache system:
 * 1. In-memory cache
 * 2. File cache (persists across restarts)
 * 3. Hardcoded fallback
 */

let chainsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = path.join(__dirname, 'chains-cache.json');

const FALLBACK_RPCS = {
  ETHEREUM: ['https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'],
  POLYGON: ['https://polygon-rpc.com', 'https://rpc-mainnet.maticvigil.com'],
};

async function getChainsData() {
  if (chainsCache && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return chainsCache;
  }

  let cachedData = null;

  if (fs.existsSync(CACHE_FILE)) {
    try {
      const fileContent = fs.readFileSync(CACHE_FILE, 'utf8');
      const cached = JSON.parse(fileContent);

      if (cached.timestamp && Date.now() - cached.timestamp < CACHE_DURATION) {
        chainsCache = cached.data;
        cacheTimestamp = cached.timestamp;
        return chainsCache;
      }
      cachedData = cached.data;
    } catch (e) {
      console.log('Failed to read cache file:', e.message);
    }
  }

  try {
    const url = 'https://chainid.network/chains.json';
    const response = await axios.get(url, { timeout: 10000 });

    chainsCache = response.data;
    cacheTimestamp = Date.now();

    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({
        data: chainsCache,
        timestamp: cacheTimestamp,
      })
    );

    return chainsCache;
  } catch (error) {
    console.log(`Failed to fetch chainlist: ${error.message}`);

    if (cachedData) {
      chainsCache = cachedData;
      cacheTimestamp = Date.now() - CACHE_DURATION;
      return chainsCache;
    }

    return null;
  }
}

/**
 * Prioritized lookup to avoid false positives
 */
async function fetchFromChainlist(chainName) {
  try {
    const chains = await getChainsData();
    if (!chains) {
      return null;
    }

    const searchName = chainName.toUpperCase();
    let chain = null;

    // 1. Exact match: shortName or symbol
    chain = chains.find(
      (c) => c.shortName?.toUpperCase() === searchName || c.nativeCurrency?.symbol?.toUpperCase() === searchName
    );

    // 2. Exact match: full name
    if (!chain) {
      chain = chains.find((c) => c.name?.toUpperCase() === searchName);
    }

    // 3. Name starts with the search term
    if (!chain) {
      chain = chains.find(
        (c) => c.name?.toUpperCase().startsWith(searchName) || c.shortName?.toUpperCase().startsWith(searchName)
      );
    }

    // 4. Partial match (only if the term is longer than 3 characters)
    if (!chain && searchName.length > 3) {
      chain = chains.find((c) => c.name?.toUpperCase().includes(searchName));
    }

    if (chain && chain.rpc && chain.rpc.length > 0) {
      const publicRpcs = chain.rpc.filter(
        (rpc) => !rpc.includes('${') && !rpc.includes('INFURA') && !rpc.includes('ALCHEMY')
      );

      if (publicRpcs.length > 0) {
        return publicRpcs;
      }
    }
  } catch (error) {
    console.log(`Failed to fetch RPCs from chainlist: ${error.message}`);
  }
  return null;
}

/**
 * 3-layer system: Cache -> Chainlist -> Fallback
 */
async function getRPCsForChain(chainName) {
  const normalized = chainName.toUpperCase();

  const chainlistRpcs = await fetchFromChainlist(chainName);
  if (chainlistRpcs && chainlistRpcs.length > 0) {
    return chainlistRpcs;
  }

  if (FALLBACK_RPCS[normalized]) {
    return FALLBACK_RPCS[normalized];
  }

  return [];
}

module.exports = {
  getRPCsForChain,
  getChainsData,
  fetchFromChainlist,
};
