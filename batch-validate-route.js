const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { validateTransaction } = require('./drivers/validator');
const { networkRepository, rpcPerformanceRepository } = require('./database/repositories');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

async function validateBatch(items) {
  if (!Array.isArray(items)) {
    throw new Error('The file must contain a JSON array of transactions, e.g. [{"chain": "ETH", "hash": "0x..."}].');
  }

  if (items.length === 0) {
    throw new Error('The file does not contain any transactions to validate.');
  }

  const results = [];

  for (const item of items) {
    if (!item || typeof item.chain !== 'string' || typeof item.hash !== 'string') {
      results.push({ ...item, error: 'Invalid item: both "chain" and "hash" are required and must be strings.' });
      continue;
    }

    try {
      const network = await networkRepository.getByName(item.chain.toLowerCase());
      if (!network) {
        results.push({ ...item, error: `Unknown network "${item.chain}".` });
        continue;
      }

      const bestRpcs = await rpcPerformanceRepository.getBestRpcs(item.chain.toLowerCase(), 3);
      let rpcToUse = network.rpc[0];
      if (bestRpcs && bestRpcs.length > 0 && bestRpcs[0]) {
        rpcToUse = typeof bestRpcs[0] === 'string' ? bestRpcs[0] : bestRpcs[0].rpc_url;
      }
      const finalRpc = rpcToUse || 'unknown_rpc_fallback';
      const networkConfig = { type: network.type, rpc: finalRpc };

      const result = await validateTransaction(networkConfig, item.hash);
      results.push({ ...item, result });
    } catch (itemError) {
      results.push({ ...item, error: itemError.message || 'Unexpected error while validating this item.' });
    }
  }

  return results;
}

router.post('/api/validate-batch-json', async (req, res) => {
  try {
    const results = await validateBatch(req.body);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not process the JSON body.' });
  }
});

router.post('/api/validate-batch', upload.single('file'), async (req, res) => {
  let filePath;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded. Send a JSON file using the "file" field.' });
    }
    filePath = req.file.path;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return res.status(400).json({ error: 'The uploaded file is not valid JSON.' });
    }

    const results = await validateBatch(data);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Could not process the uploaded file.' });
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
});

module.exports = router;
