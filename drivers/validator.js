/**
 * TRANSACTION VALIDATOR
 * Main entry point for validating Ethereum -> Polygon transactions
 */

const { validateEVM } = require('./evm');

async function validateTransaction(networkConfig, hash) {
  const { type, rpc } = networkConfig;

  switch (type) {
    case 'EVM':
      return await validateEVM(rpc, hash);
    default:
      return { found: false, error: `Unsupported network type: "${type}"` };
  }
}

module.exports = { validateTransaction };
