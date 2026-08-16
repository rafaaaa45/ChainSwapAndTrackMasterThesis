const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool (singleton)
 */
class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Erro inesperado no pool PostgreSQL:', err);
    });
  }

  async query(text, params) {
    return await this.pool.query(text, params);
  }

  async getClient() {
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }

  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as now, version() as version');
      return {
        healthy: true,
        timestamp: result.rows[0].now,
        version: result.rows[0].version,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }
}

const db = new Database();

module.exports = db;
