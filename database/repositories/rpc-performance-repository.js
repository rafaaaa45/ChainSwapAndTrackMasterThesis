const db = require('../db');

/**
 * Repository para RPC Performance Tracking
 */
class RpcPerformanceRepository {
  async recordSuccess(chain, rpcUrl, responseTimeMs) {
    await db.query(
      `INSERT INTO rpc_performance (chain, rpc_url, success_count, total_response_time_ms, last_success_at)
       VALUES ($1, $2, 1, $3, NOW())
       ON CONFLICT (chain, rpc_url)
       DO UPDATE SET
         success_count = rpc_performance.success_count + 1,
         total_response_time_ms = rpc_performance.total_response_time_ms + $3,
         last_success_at = NOW()`,
      [chain.toLowerCase(), rpcUrl, responseTimeMs]
    );
  }

  async recordError(chain, rpcUrl) {
    await db.query(
      `INSERT INTO rpc_performance (chain, rpc_url, error_count, last_error_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (chain, rpc_url)
       DO UPDATE SET
         error_count = rpc_performance.error_count + 1,
         last_error_at = NOW()`,
      [chain.toLowerCase(), rpcUrl]
    );
  }

  async getHealthScores() {
    const result = await db.query('SELECT * FROM rpc_health ORDER BY success_rate DESC, avg_response_time_ms ASC');
    return result.rows;
  }

  async getBestRpcs(chain, limit = 3) {
    const result = await db.query(
      `SELECT
         rpc_url,
         success_count,
         error_count,
         CASE
           WHEN (success_count + error_count) = 0 THEN 0
           ELSE ROUND(((success_count::FLOAT / (success_count + error_count)) * 100)::numeric, 2)
         END as success_rate,
         CASE
           WHEN success_count = 0 THEN 0
           ELSE ROUND((total_response_time_ms::FLOAT / success_count)::numeric, 2)
         END as avg_response_time_ms
       FROM rpc_performance
       WHERE chain = $1
         AND success_count > 0
       ORDER BY success_rate DESC, avg_response_time_ms ASC
       LIMIT $2`,
      [chain.toLowerCase(), limit]
    );
    return result.rows.map((row) => row.rpc_url);
  }

  async resetStats() {
    const result = await db.query('DELETE FROM rpc_performance RETURNING *');
    return result.rowCount;
  }
}

module.exports = new RpcPerformanceRepository();
