# ChainGuard - Ethereum → Polygon Transaction Validator

A system to validate Ethereum transactions and verify whether tokens have arrived on Polygon through the official bridge.

## Project Structure

```
chainguard_project/
├── server.js                  # Express server (API routes)
├── batch-validate-route.js    # Batch validation route
├── rpc-fetcher.js             # Automatic public RPC discovery (chainlist.org)
├── index.html                 # Frontend interface
├── drivers/
│   ├── evm.js                 # EVM driver + Polygon bridge tracking logic
│   └── validator.js           # Validation entry point
├── database/
│   ├── db.js                  # PostgreSQL connection pool
│   ├── setup.js                # Initial database setup script
│   ├── schema.sql             # Database schema
│   └── repositories/          # Data access layer
├── public/
│   ├── app.js
│   └── styles.css
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```
DATABASE_URL=postgres://chainguard:chainguard@localhost:15432/chainguard_db
ALCHEMY_ETH_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 3. Set up the database

```bash
npm run db:setup
```

### 4. Start the server

```bash
npm start
```

The server runs on `http://localhost:3000`.

### 5. Alternative: Docker Compose

```bash
docker compose up
```

## Features

### Validate a Transaction
- Enter an Ethereum transaction hash
- The system fetches the transaction details and detects bridge events (`LockedERC20`, `LockedEther`)
- When a bridge event is detected, it automatically checks whether the tokens have already arrived on Polygon

### Add a New EVM Network
- Provide a symbol (e.g. ETH, POLYGON)
- The system automatically looks up public RPCs via chainlist.org
- Or supply an RPC manually

## API Endpoints

### GET `/api/networks`
Lists all configured networks.

### POST `/api/validate`
Validates a single transaction.
```json
{
  "chain": "ETHEREUM",
  "hash": "0x..."
}
```

### POST `/api/add-network`
Adds a new EVM network.
```json
{
  "symbol": "POLYGON",
  "type": "EVM",
  "rpc": "https://..."
}
```

### GET `/api/rpcs/:chain`
Returns the public RPCs available for a given chain.

### POST `/api/validate-batch-json` / `/api/validate-batch`
Validates multiple transactions at once (JSON body, or a JSON file upload).

`/api/validate-batch` expects `multipart/form-data` with a `file` field containing a JSON array:
```json
[
  { "chain": "ETH", "hash": "0x..." },
  { "chain": "ETH", "hash": "0x..." }
]
```

This is intended for API/script usage (e.g. Postman, curl) rather than the web UI, since processing happens sequentially and can take a while for large batches.

## EVM Driver

The `drivers/evm.js` driver:
- Fetches the transaction and its receipt via JSON-RPC (`eth_getTransactionByHash`, `eth_getTransactionReceipt`)
- Decodes `Transfer`, `LockedERC20` and `LockedEther` events
- When it detects tokens being locked for the Polygon bridge, it queries the Polygon network (`eth_getLogs`) for the matching mint, confirming whether the cross-chain transfer has completed

## Technologies

- Backend: Node.js + Express
- Frontend: Plain HTML + JavaScript
- Blockchain: ethers.js
- Database: PostgreSQL
