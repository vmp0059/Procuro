const pool = require('../config/db');

const logActivity = async (userId, action, entityType, entityId, metadata = {}) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
};

module.exports = logActivity;
