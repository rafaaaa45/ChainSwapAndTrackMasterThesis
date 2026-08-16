const db = require('../db');

/**
 * Repository para Blockchain Networks
 */
class NetworkRepository {
  async getAll() {
    const result = await db.query('SELECT * FROM blockchain_networks WHERE enabled = true ORDER BY name');
    return result.rows;
  }

  async getByName(name) {
    const result = await db.query('SELECT * FROM blockchain_networks WHERE name = $1 AND enabled = true', [
      name.toLowerCase(),
    ]);
    return result.rows[0] || null;
  }

  async create(name, type, rpcs) {
    const result = await db.query(
      `INSERT INTO blockchain_networks (name, type, rpc)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.toLowerCase(), type.toUpperCase(), rpcs]
    );
    return result.rows[0];
  }

  async updateRpcs(name, rpcs) {
    const result = await db.query(
      `UPDATE blockchain_networks
       SET rpc = $2, updated_at = NOW()
       WHERE name = $1
       RETURNING *`,
      [name.toLowerCase(), rpcs]
    );
    return result.rows[0] || null;
  }

  async addRpc(name, newRpc) {
    const result = await db.query(
      `UPDATE blockchain_networks
       SET rpc = array_append(rpc, $2), updated_at = NOW()
       WHERE name = $1
       RETURNING *`,
      [name.toLowerCase(), newRpc]
    );
    return result.rows[0] || null;
  }

  async disable(name) {
    await db.query('UPDATE blockchain_networks SET enabled = false WHERE name = $1', [name.toLowerCase()]);
  }

  async getStats() {
    const result = await db.query(`
      SELECT
        bn.name,
        bn.type,
        COUNT(vh.id) as total_validations,
        SUM(CASE WHEN vh.found THEN 1 ELSE 0 END) as successful_validations
      FROM blockchain_networks bn
      LEFT JOIN validation_history vh ON vh.chain = bn.name
      WHERE bn.enabled = true
      GROUP BY bn.name, bn.type
      ORDER BY total_validations DESC
    `);
    return result.rows;
  }
}

module.exports = new NetworkRepository();
