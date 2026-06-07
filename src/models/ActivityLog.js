const pool = require('../config/db');

const findAll = async ({ where = '', params = [], limit, offset }) => {
  params = [...params, limit, offset];
  const result = await pool.query(
    `SELECT a.*, u.name as user_name, u.email as user_email FROM activity_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
};

const count = async ({ where = '', params = [] } = {}) => {
  const result = await pool.query(`SELECT COUNT(*) FROM activity_logs a ${where}`, params);
  return parseInt(result.rows[0].count);
};

const findNotificationsByUser = async (userId) => {
  const result = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return result.rows;
};

const markNotificationRead = async (id, userId) => {
  await pool.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
};

const markAllNotificationsRead = async (userId) => {
  await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
};

module.exports = { findAll, count, findNotificationsByUser, markNotificationRead, markAllNotificationsRead };
