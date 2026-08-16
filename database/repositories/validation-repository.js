const db = require('../db');

/**
 * Repository para Validation History
 */
class ValidationRepository {
  async logValidation(chain, txHash, result, rpcUsed, responseTimeMs) {
    const validationData = await db.query(
      `INSERT INTO validation_history
       (chain, tx_hash, found, data, error, rpc_used, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        chain.toLowerCase(),
        txHash,
        result.found,
        result.data ? JSON.stringify(result.data) : null,
        result.error || null,
        rpcUsed,
        responseTimeMs,
      ]
    );
    return validationData.rows[0];
  }

  async findRecent(txHash, maxAgeMinutes = 60) {
    const result = await db.query(
      `SELECT * FROM validation_history
       WHERE tx_hash = $1
         AND validated_at > NOW() - INTERVAL '${maxAgeMinutes} minutes'
       ORDER BY validated_at DESC
       LIMIT 1`,
      [txHash]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      found: row.found,
      data: row.data,
      error: row.error,
      cachedAt: row.validated_at,
    };
  }

  async getStatsByChain(chain, days = 7) {
    const result = await db.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN found THEN 1 ELSE 0 END) as successful,
        AVG(response_time_ms) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time
       FROM validation_history
       WHERE chain = $1
         AND validated_at > NOW() - INTERVAL '${days} days'`,
      [chain.toLowerCase()]
    );

    const stats = result.rows[0];
    return {
      chain,
      period_days: days,
      total_validations: parseInt(stats.total),
      successful: parseInt(stats.successful),
      failed: parseInt(stats.total) - parseInt(stats.successful),
      success_rate: stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(2) : 0,
      avg_response_time_ms: stats.avg_response_time ? parseFloat(stats.avg_response_time).toFixed(2) : 0,
      min_response_time_ms: stats.min_response_time || 0,
      max_response_time_ms: stats.max_response_time || 0,
    };
  }

  async getRecent(limit = 100) {
    const result = await db.query('SELECT * FROM validation_history ORDER BY validated_at DESC LIMIT $1', [limit]);
    return result.rows;
  }

  async cleanOldRecords(daysToKeep = 90) {
    const result = await db.query(
      `DELETE FROM validation_history
       WHERE validated_at < NOW() - INTERVAL '${daysToKeep} days'
       RETURNING *`
    );
    return result.rowCount;
  }
}

module.exports = new ValidationRepository();
