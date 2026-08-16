const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  console.log('Starting PostgreSQL setup...');

  const dbName = process.env.DATABASE_URL?.split('/').pop() || 'chainguard_db';
  const baseUrl = process.env.DATABASE_URL?.replace(`/${dbName}`, '/postgres');

  const adminClient = new Client({ connectionString: baseUrl });

  try {
    await adminClient.connect();
    const dbCheck = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (dbCheck.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log('Database created');
    }
    await adminClient.end();

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('Schema applied');

    const ethRpc = process.env.ALCHEMY_ETH_RPC || 'https://eth.drpc.org';
    const rpcValue = `{${ethRpc}}`;

    await client.query(
      `INSERT INTO blockchain_networks (name, type, rpc, enabled)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (name) DO UPDATE SET rpc = $3, enabled = true`,
      ['ethereum', 'EVM', rpcValue]
    );

    const check = await client.query('SELECT name FROM blockchain_networks');
    console.log(`Total networks in database: ${check.rowCount}`);
    check.rows.forEach((r) => console.log(`   - ${r.name}`));

    await client.end();
    console.log('Setup complete');
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
