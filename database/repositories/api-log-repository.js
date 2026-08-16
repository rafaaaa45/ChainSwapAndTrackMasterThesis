const db = require('../db');

/**
 * Repository para API Request Logs (audit trail)
 */
class ApiLogRepository {
  async log(endpoint, method, statusCode, ipAddress, userAgent, requestBody, responseTimeMs) {
    await db.query(
      `INSERT INTO api_logs
       (endpoint, method, status_code, ip_address, user_agent, request_body, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        endpoint,
        method,
        statusCode,
        ipAddress,
        userAgent,
        requestBody ? JSON.stringify(requestBody) : null,
        responseTimeMs,
      ]
    );
  }

  async getRecent(limit = 100) {
    const result = await db.query('SELECT * FROM api_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return result.rows;
  }

  async getByIp(ipAddress, minutes = 60) {
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM api_logs
       WHERE ip_address = $1
         AND created_at > NOW() - INTERVAL '${minutes} minutes'`,
      [ipAddress]
    );
    return parseInt(result.rows[0].count);
  }

  async getStats(days = 7) {
    const result = await db.query(
      `SELECT
         endpoint,
         method,
         COUNT(*) as total_requests,
         AVG(response_time_ms) as avg_response_time,
         COUNT(DISTINCT ip_address) as unique_ips
       FROM api_logs
       WHERE created_at > NOW() - INTERVAL '${days} days'
       GROUP BY endpoint, method
       ORDER BY total_requests DESC`
    );
    return result.rows;
  }

  async cleanOldLogs(daysToKeep = 30) {
    const result = await db.query(
      `DELETE FROM api_logs
       WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
       RETURNING *`
    );
    return result.rowCount;
  }
}

module.exports = new ApiLogRepository();
