const express = require('express');
const winston = require('winston');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { validateTransaction } = require('./drivers/validator');
const { redactRpc } = require('./drivers/evm');
const { getRPCsForChain } = require('./rpc-fetcher');
const db = require('./database/db');
const { networkRepository, validationRepository, rpcPerformanceRepository, apiLogRepository } = require('./database/repositories');
const batchValidateRoute = require('./batch-validate-route');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(batchValidateRoute);

const PORT = process.env.PORT || 3000;

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'app.log' })],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    apiLogRepository
      .log(req.path, req.method, res.statusCode, req.ip || req.connection.remoteAddress, req.get('user-agent'), req.body, Date.now() - start)
      .catch(() => {});
    logger.info(`${req.method} ${req.path} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/networks', async (req, res) => {
  try {
    const networks = await networkRepository.getAll();
    const formatted = Object.fromEntries(
      networks.map((net) => [net.name.toUpperCase(), { type: net.type, rpc: redactRpc(net.rpc[0]), rpcs: net.rpc.map(redactRpc) }])
    );
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/validate', async (req, res) => {
  const { chain, hash } = req.body;
  if (!chain || !hash) return res.json({ valid: false, error: 'Both "chain" and "hash" are required.' });

  try {
    const cached = await validationRepository.findRecent(hash, 60);
    if (cached) {
      return res.json(cached.found ? { valid: true, data: cached.data, cached: true } : { valid: false, error: cached.error, cached: true });
    }

    const network = await networkRepository.getByName(chain.toLowerCase());
    if (!network) return res.json({ valid: false, error: `Unknown network "${chain}". Check GET /api/networks for the supported list.` });

    let rpcToUse;
    const chainKey = chain.toLowerCase();

    if (chainKey === 'ethereum' || chainKey === 'eth') {
      rpcToUse = process.env.ALCHEMY_ETH_RPC;
    } else if (chainKey === 'polygon' || chainKey === 'matic') {
      rpcToUse = process.env.ALCHEMY_POLYGON_RPC;
    } else {
      const bestRpcs = await rpcPerformanceRepository.getBestRpcs(chainKey, 3);
      rpcToUse = network.rpc[0];
      if (bestRpcs && bestRpcs.length > 0 && bestRpcs[0]) {
        rpcToUse = typeof bestRpcs[0] === 'string' ? bestRpcs[0] : bestRpcs[0].rpc_url;
      }
    }

    const finalRpc = rpcToUse || 'unknown_rpc_fallback';
    const networkConfig = { type: network.type, rpc: finalRpc };

    const startTime = Date.now();
    const result = await validateTransaction(networkConfig, hash);
    const responseTime = Date.now() - startTime;

    await validationRepository.logValidation(chain.toLowerCase(), hash, result, finalRpc, responseTime);

    if (result.found) await rpcPerformanceRepository.recordSuccess(chain.toLowerCase(), finalRpc, responseTime);
    else if (result.error) await rpcPerformanceRepository.recordError(chain.toLowerCase(), finalRpc);

    res.json(result.found ? { valid: true, data: result.data } : { valid: false, error: result.error || 'Transaction not found on this network.' });
  } catch (e) {
    await validationRepository.logValidation(chain.toLowerCase(), hash, { found: false, error: e.message }, 'unknown', 0).catch(() => {});
    res.json({ valid: false, error: `Unexpected error while validating: ${e.message}` });
  }
});

app.post('/api/add-network', async (req, res) => {
  const { symbol, type, rpc } = req.body;
  if (!symbol || !type) return res.status(400).json({ success: false, error: '"symbol" and "type" are required.' });

  const networkName = symbol.toLowerCase();
  let finalRpc = rpc;

  try {
    const existing = await networkRepository.getByName(networkName);
    if (existing) return res.status(400).json({ success: false, error: `Network "${symbol}" already exists.` });

    if (!finalRpc) {
      const rpcs = await getRPCsForChain(symbol);
      if (!rpcs || rpcs.length === 0) {
        return res.status(400).json({ success: false, error: `Could not find a public RPC for "${symbol}" automatically. Please provide one manually.` });
      }
      finalRpc = rpcs[0];
    }

    const rpcs = Array.isArray(finalRpc) ? finalRpc : [finalRpc];
    const network = await networkRepository.create(networkName, type, rpcs);
    res.json({ success: true, network });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/rpcs/:chain', async (req, res) => {
  try {
    const rpcs = await getRPCsForChain(req.params.chain);
    res.json({ chain: req.params.chain, rpcs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, async () => {
  logger.info(`ChainGuard server running on port ${PORT}`);
  try {
    const networks = await networkRepository.getAll();
    logger.info(`Available networks: ${networks.map((n) => n.name).join(', ') || 'none'}`);
  } catch (e) {
    logger.warn('Could not fetch networks on startup:', e);
  }
});

async function shutdown() {
  logger.info('Shutting down server...');
  try {
    await db.close();
  } catch (e) {
    // ignore errors while closing the pool during shutdown
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
