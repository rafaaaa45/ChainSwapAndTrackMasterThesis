const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();
const { getRPCsForChain } = require('../rpc-fetcher');

let networkRepository = null;
try {
  // Lazy/optional require: evm.js should still work standalone (e.g. tests)
  // even if the DB isn't reachable.
  networkRepository = require('../database/repositories').networkRepository;
} catch (e) {
  networkRepository = null;
}

async function rpcCall(rpcUrl, method, params) {
  const response = await axios.post(rpcUrl, { jsonrpc: '2.0', method, params, id: 1 });
  if (response.data.error) throw new Error(response.data.error.message);
  return response.data.result;
}

const ROOT_CHAIN_MANAGER = '0xA0c68C638235ee32657e8f720a23cec1bfc77c77';
const ARRIVAL_WINDOW_SECONDS = 90 * 60;
const LOG_CHUNK_SIZE = 1000;
const POLYGON_BLOCK_TIME = 2.1;

// Ethereum -> Polygon token mapping (same token's address on Polygon)
// Fallback only: the bridge is queried first via rootToChildToken.
const ETH_TO_POLYGON_TOKEN = {
  ETH: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH on Polygon
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f': '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', // DAI
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6', // WBTC
  '0x467bccd9d29f223bce8043b84e8c8b282827790f': '0xdf7837de1f2fa4631d716cf2502f8b230f1dcc32', // TEL
  '0x3f382dbd960e3a9bbceae22651e88158d2791550': '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7', // GHST
  '0x514910771af9ca656af840dff83e8264ecf986ca': '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39', // LINK
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': '0xb33eaad8d922b1083446dc23f610c2567fb5180f', // UNI
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': '0xd6df932a45c0f255f85145f286ea0b292b21c90b', // AAVE
  '0xd533a949740bb3306d119cc777fa900ba034cd52': '0x172370d5cd63279efa6d502facf6ce1da2281a25', // CRV
  '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': '0x0b3f868e0be559ce70718bc3d6c26bb8cb350cb0', // SUSHI
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': '0x6f7c932e7684666c9fd1d44527765433e01ff61d', // MKR
  '0xc00e94cb662c3520282e6f5717214004a7f26888': '0x8505b9d2254a7ae468c0e9dd10cce3a33ce1e220', // COMP
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': '0x4bf7737515ee8862306342f2048a1cc26d6a2f77', // BAT
  '0x8798243c2eb2b5d36b81ceeb1eb3606f1eb3d15b': '0x27f8d03b3a2196956ed5234b1a8d05a40b9910dd', // SNX
  '0x0f5d2fb29fb7d3cfee444a200298f468908cc942': '0x282d8efce846a88b159800bd4130ad77443fa1a1', // MANA
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec', // SHIB
};

const TOKENS_6_DECIMALS = [
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
];

const childTokenCache = new Map();

function redactRpc(rpcUrl) {
  try {
    const u = new URL(rpcUrl);
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length > 0) segments[segments.length - 1] = '***';
    return `${u.hostname}/${segments.join('/')}`;
  } catch (e) {
    return 'invalid_rpc_url';
  }
}

function getDecimals(tokenAddress) {
  return TOKENS_6_DECIMALS.includes(tokenAddress?.toLowerCase()) ? 6 : 18;
}

async function getChildToken(ethRpc, rootToken) {
  const key = rootToken.toLowerCase();
  if (childTokenCache.has(key)) return childTokenCache.get(key);

  const iface = new ethers.utils.Interface([
    'function rootToChildToken(address) view returns (address)',
  ]);

  try {
    const res = await rpcCall(ethRpc, 'eth_call', [
      { to: ROOT_CHAIN_MANAGER, data: iface.encodeFunctionData('rootToChildToken', [rootToken]) },
      'latest',
    ]);
    if (!res || res === '0x') throw new Error('empty response');

    const [child] = iface.decodeFunctionResult('rootToChildToken', res);
    const out = child === ethers.constants.AddressZero ? null : child;
    childTokenCache.set(key, out);
    return out;
  } catch (e) {
    childTokenCache.set(key, null);
    return null;
  }
}

// Binary search. Block time on Polygon has drifted over the years, so
// extrapolating from an average puts you thousands of blocks off.
async function findBlockByTimestamp(rpcUrl, targetTs) {
  let lo = 1;
  let hi = parseInt(await rpcCall(rpcUrl, 'eth_blockNumber', []), 16);

  const head = await rpcCall(rpcUrl, 'eth_getBlockByNumber', ['0x' + hi.toString(16), false]);
  if (head && parseInt(head.timestamp, 16) < targetTs) return hi;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const block = await rpcCall(rpcUrl, 'eth_getBlockByNumber', ['0x' + mid.toString(16), false]);
    if (!block) throw new Error(`block not found at height ${mid}`);

    if (parseInt(block.timestamp, 16) < targetTs) lo = mid + 1;
    else hi = mid;
  }

  return lo;
}

async function getPolygonRpcs() {
  const candidates = [];

  if (process.env.ALCHEMY_POLYGON_RPC) candidates.push(process.env.ALCHEMY_POLYGON_RPC);

  // Reuse whatever Polygon RPCs are already configured for the app (DB),
  // e.g. ones auto-discovered via chainlist when the network was added.
  if (networkRepository) {
    try {
      const network = await networkRepository.getByName('polygon');
      if (network?.rpc?.length) candidates.push(...network.rpc);
    } catch (e) {
      // DB might not be reachable from here in some setups; ignore and fall through.
    }
  }

  // Last resort: public RPCs (chainlist.org, with hardcoded fallback).
  try {
    const publicRpcs = await getRPCsForChain('POLYGON');
    if (publicRpcs?.length) candidates.push(...publicRpcs);
  } catch (e) {
    // ignore
  }

  return [...new Set(candidates.filter(Boolean))];
}

/**
 * Checks whether tokens have arrived on Polygon after a bridge operation.
 * The Polygon bridge mints tokens (a Transfer from the zero address) to the receiver.
 *
 * The window is positioned from the source transaction's timestamp. Anchoring
 * it to the chain head reports every deposit older than the window as pending.
 */
async function checkPolygonLanding(userAddress, tokenAddressEth, sourceTimestamp, ethRpc) {
  const polygonRpcs = await getPolygonRpcs();

  if (polygonRpcs.length === 0) {
    return {
      status: 'ERROR',
      info: 'Could not verify the Polygon side: no Polygon RPC is configured (ALCHEMY_POLYGON_RPC is missing and no public RPC could be discovered).',
    };
  }

  const tokenKey = typeof tokenAddressEth === 'string' ? tokenAddressEth.toLowerCase() : tokenAddressEth;

  let polygonTokenAddress = ETH_TO_POLYGON_TOKEN[tokenKey];
  if (!polygonTokenAddress && tokenKey !== 'ETH' && ethRpc) {
    polygonTokenAddress = await getChildToken(ethRpc, tokenAddressEth);
  }

  if (!polygonTokenAddress) {
    return {
      status: 'UNMAPPED_TOKEN',
      info: `The bridge reports no child token for ${tokenAddressEth}. Either it is not mapped on the PoS bridge, or a different bridge was used.`,
    };
  }

  if (!sourceTimestamp) {
    return {
      status: 'ERROR',
      info: 'Could not verify the Polygon side: the source transaction timestamp is unknown, so the search window cannot be positioned.',
    };
  }

  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const receiverTopic = '0x000000000000000000000000' + userAddress.toLowerCase().replace('0x', '');

  const windowBlocks = Math.ceil(ARRIVAL_WINDOW_SECONDS / POLYGON_BLOCK_TIME);
  const windowHasElapsed = Math.floor(Date.now() / 1000) > sourceTimestamp + ARRIVAL_WINDOW_SECONDS;

  const rpcErrors = [];
  let searched = null;

  for (const polygonRpc of polygonRpcs) {
    try {
      const startBlock = await findBlockByTimestamp(polygonRpc, sourceTimestamp);
      const head = parseInt(await rpcCall(polygonRpc, 'eth_blockNumber', []), 16);
      const endBlock = Math.min(startBlock + windowBlocks, head);

      let mintLog = null;
      for (let s = startBlock; s <= endBlock && !mintLog; s += LOG_CHUNK_SIZE) {
        const e = Math.min(s + LOG_CHUNK_SIZE - 1, endBlock);
        const logs = await rpcCall(polygonRpc, 'eth_getLogs', [
          {
            fromBlock: '0x' + s.toString(16),
            toBlock: '0x' + e.toString(16),
            address: polygonTokenAddress,
            topics: [TRANSFER_TOPIC, ZERO_ADDRESS_TOPIC, receiverTopic],
          },
        ]);
        if (logs && logs.length > 0) mintLog = logs[0];
      }

      if (mintLog) {
        const blockNumber = parseInt(mintLog.blockNumber, 16);
        return {
          status: 'CONFIRMED',
          info: `Tokens have arrived on Polygon. Mint detected in block ${blockNumber}.`,
          polygon_token: polygonTokenAddress,
          mint_tx: mintLog.transactionHash,
          mint_block: blockNumber,
        };
      }

      searched = { from: startBlock, to: endBlock };
      break;
    } catch (e) {
      const reason = e.response?.data?.error?.message || e.response?.statusText || e.message;
      rpcErrors.push(`${redactRpc(polygonRpc)} -> ${reason}`);
      continue;
    }
  }

  // A node that couldn't cover the range must not produce a negative result.
  if (!searched) {
    return {
      status: 'ERROR',
      info: `Could not verify the Polygon side: no RPC could search the required range (archive access is needed for older deposits). Details: ${rpcErrors.join(' | ')}`,
    };
  }

  return {
    status: windowHasElapsed ? 'NOT_FOUND' : 'PENDING',
    info: windowHasElapsed
      ? `No mint to ${userAddress} found within ${ARRIVAL_WINDOW_SECONDS / 60} minutes of the source transaction.`
      : 'No mint detected yet. The deposit is recent and the bridge can take up to 30 minutes.',
    polygon_token: polygonTokenAddress,
    checked_from_block: searched.from,
    checked_to_block: searched.to,
  };
}

async function validateEVM(rpcUrl, hash) {
  try {
    const tx = await rpcCall(rpcUrl, 'eth_getTransactionByHash', [hash]);
    if (!tx) return { found: false, error: 'Transaction not found on this network.' };

    const receipt = await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [hash]);
    const logs = receipt?.logs || [];

    let sourceTimestamp = null;
    if (tx.blockNumber) {
      try {
        const srcBlock = await rpcCall(rpcUrl, 'eth_getBlockByNumber', [tx.blockNumber, false]);
        if (srcBlock) sourceTimestamp = parseInt(srcBlock.timestamp, 16);
      } catch (e) {
        // leave null; checkPolygonLanding reports it
      }
    }

    const abi = [
      'event Transfer(address indexed from, address indexed to, uint256 value)',
      'event LockedERC20(address indexed depositor, address indexed depositReceiver, address indexed rootToken, uint256 amount)',
      'event LockedEther(address indexed depositor, address indexed depositReceiver, uint256 amount)',
    ];

    const iface = new ethers.utils.Interface(abi);
    let destinationStatus = null;

    const decodedLogs = await Promise.all(
      logs.map(async (log) => {
        try {
          const parsed = iface.parseLog({ topics: log.topics, data: log.data });
          if (!parsed) return null;

          const contractAddress = log.address.toLowerCase();

          if (parsed.name === 'Transfer') {
            const decimals = getDecimals(contractAddress);
            return {
              type: 'ERC-20 Transfer',
              from: parsed.args[0],
              to: parsed.args[1],
              value: ethers.utils.formatUnits(parsed.args[2], decimals),
            };
          }

          if (parsed.name === 'LockedERC20') {
            const rootToken = parsed.args[2].toLowerCase();
            const decimals = getDecimals(rootToken);
            const receiver = parsed.args[1];
            const val = ethers.utils.formatUnits(parsed.args[3], decimals);

            const polygonCheck = await checkPolygonLanding(receiver, rootToken, sourceTimestamp, rpcUrl);

            destinationStatus = {
              network: 'Polygon',
              receiver,
              expected_value: val,
              status: polygonCheck.status,
              details: polygonCheck.info,
              ...(polygonCheck.mint_tx && { mint_tx: polygonCheck.mint_tx }),
              ...(polygonCheck.mint_block && { mint_block: polygonCheck.mint_block }),
              ...(polygonCheck.polygon_token && { polygon_token: polygonCheck.polygon_token }),
              ...(polygonCheck.checked_from_block !== undefined && {
                checked_from_block: polygonCheck.checked_from_block,
                checked_to_block: polygonCheck.checked_to_block,
              }),
            };

            return {
              type: 'Cross-Chain: Polygon Bridge (ERC-20)',
              action: 'Tokens Locked on Ethereum',
              to_polygon_user: receiver,
              value: val,
            };
          }

          if (parsed.name === 'LockedEther') {
            const receiver = parsed.args[1];
            const val = ethers.utils.formatUnits(parsed.args[2], 18);

            const polygonCheck = await checkPolygonLanding(receiver, 'ETH', sourceTimestamp, rpcUrl);

            destinationStatus = {
              network: 'Polygon',
              receiver,
              expected_value: val + ' ETH',
              status: polygonCheck.status,
              details: polygonCheck.info,
              ...(polygonCheck.mint_tx && { mint_tx: polygonCheck.mint_tx }),
              ...(polygonCheck.mint_block && { mint_block: polygonCheck.mint_block }),
              ...(polygonCheck.polygon_token && { polygon_token: polygonCheck.polygon_token }),
              ...(polygonCheck.checked_from_block !== undefined && {
                checked_from_block: polygonCheck.checked_from_block,
                checked_to_block: polygonCheck.checked_to_block,
              }),
            };

            return {
              type: 'Cross-Chain: Polygon Bridge (Native ETH)',
              action: 'ETH Locked on Ethereum',
              to_polygon_user: receiver,
              value: val + ' ETH',
            };
          }
        } catch (e) {
          return null;
        }
      })
    );

    const cleanLogs = decodedLogs.filter((e) => e !== null);
    const valueEth = ethers.utils.formatUnits(tx.value || '0x0', 18);

    return {
      found: true,
      data: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value_eth: valueEth,
        status: receipt?.status === '0x1' ? 'Success' : receipt ? 'Failed' : 'Pending',
        block: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
        block_timestamp: sourceTimestamp,
        gas_used: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null,
        events: cleanLogs,
        ...(destinationStatus && { bridge_destination_check: destinationStatus }),
      },
    };
  } catch (error) {
    return { found: false, error: error.message };
  }
}

module.exports = { validateEVM, redactRpc, checkPolygonLanding, findBlockByTimestamp, getChildToken };