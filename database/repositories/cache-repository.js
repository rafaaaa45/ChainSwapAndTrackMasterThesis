const db = require('../db');

/**
 * Repository for RPC cache (replaces chains-cache.json with persistent storage)
 */
class CacheRepository {
  async getValidCache() {
    const result = await db.query(
      `SELECT chain_id, chain_name, short_name, rpc_urls, cached_at
       FROM rpc_cache
       WHERE expires_at > NOW()
       ORDER BY cached_at DESC`
    );

    return result.rows.map((row) => ({
      chainId: row.chain_id,
      name: row.chain_name,
      shortName: row.short_name,
      rpc: row.rpc_urls,
    }));
  }

  async saveCache(chains, durationHours = 24) {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM rpc_cache');

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + durationHours);

      for (const chain of chains) {
        await client.query(
          `INSERT INTO rpc_cache (chain_id, chain_name, short_name, rpc_urls, expires_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [chain.chainId, chain.name, chain.shortName, JSON.stringify(chain.rpc || []), expiresAt]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findChain(searchTerm) {
    const result = await db.query(
      `SELECT chain_id, chain_name, short_name, rpc_urls
       FROM rpc_cache
       WHERE expires_at > NOW()
         AND (
           chain_id::TEXT = $1
           OR LOWER(chain_name) LIKE $2
           OR LOWER(short_name) = $3
         )
       LIMIT 1`,
      [searchTerm, `%${searchTerm.toLowerCase()}%`, searchTerm.toLowerCase()]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      chainId: row.chain_id,
      name: row.chain_name,
      shortName: row.short_name,
      rpc: JSON.parse(row.rpc_urls),
    };
  }

  async isCacheExpired() {
    const result = await db.query('SELECT COUNT(*) as count FROM rpc_cache WHERE expires_at > NOW()');
    return parseInt(result.rows[0].count) === 0;
  }

  async cleanExpired() {
    const result = await db.query('DELETE FROM rpc_cache WHERE expires_at <= NOW() RETURNING *');
    return result.rowCount;
  }
}

module.exports = new CacheRepository();
