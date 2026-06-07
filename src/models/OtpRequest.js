const pool = require('../config/db');

const create = async ({ email, user_id = null, purpose, payload, otp_hash, expires_at }) => {
  const result = await pool.query(
    `INSERT INTO otp_requests (email, user_id, purpose, payload, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, user_id, purpose, expires_at, attempts, verified_at, created_at`,
    [email, user_id, purpose, JSON.stringify(payload || {}), otp_hash, expires_at]
  );
  return result.rows[0];
};

const findLatestActive = async ({ email, purpose, userId = null }) => {
  const params = [email, purpose];
  let query = `
    SELECT *
    FROM otp_requests
    WHERE email = $1
      AND purpose = $2
      AND verified_at IS NULL
      AND expires_at > NOW()`;

  if (userId) {
    params.push(userId);
    query += ` AND user_id = $3`;
  } else {
    query += ` AND user_id IS NULL`;
  }

  query += ' ORDER BY created_at DESC LIMIT 1';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const incrementAttempts = async (id) => {
  await pool.query('UPDATE otp_requests SET attempts = attempts + 1, updated_at = NOW() WHERE id = $1', [id]);
};

const markVerified = async (id) => {
  await pool.query('UPDATE otp_requests SET verified_at = NOW(), updated_at = NOW() WHERE id = $1', [id]);
};

const removeById = async (id) => {
  await pool.query('DELETE FROM otp_requests WHERE id = $1', [id]);
};

const removeExpired = async () => {
  await pool.query('DELETE FROM otp_requests WHERE expires_at < NOW() OR verified_at IS NOT NULL');
};

module.exports = { create, findLatestActive, incrementAttempts, markVerified, removeById, removeExpired };
