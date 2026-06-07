const pool = require('../config/db');

const findByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const findById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const findAll = async ({ role, limit, offset }) => {
  const params = [];
  let query = 'SELECT id, name, email, role, is_active, created_at FROM users';
  if (role) { params.push(role); query += ` WHERE role = $${params.length}`; }
  params.push(limit, offset);
  query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const result = await pool.query(query, params);
  return result.rows;
};

const count = async ({ role } = {}) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM users${role ? ' WHERE role = $1' : ''}`,
    role ? [role] : []
  );
  return parseInt(result.rows[0].count);
};

const create = async ({ name, email, password, role }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
    [name, email, password, role]
  );
  return result.rows[0];
};

const update = async (id, { name, is_active }) => {
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), is_active = COALESCE($2, is_active), updated_at = NOW()
     WHERE id = $3 RETURNING id, name, email, role, is_active, updated_at`,
    [name, is_active, id]
  );
  return result.rows[0] || null;
};

const updatePassword = async (id, hashedPassword) => {
  await pool.query(
    'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, id]
  );
};

const getPasswordById = async (id) => {
  const result = await pool.query('SELECT password FROM users WHERE id = $1', [id]);
  return result.rows[0]?.password || null;
};

const remove = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

module.exports = { findByEmail, findById, findAll, count, create, update, updatePassword, getPasswordById, remove };
