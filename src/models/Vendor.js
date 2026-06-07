const pool = require('../config/db');

const findAll = async ({ status, category, search, limit, offset }) => {
  const params = [];
  const conditions = [];

  if (status)   { params.push(status);          conditions.push(`status = $${params.length}`); }
  if (category) { params.push(category);         conditions.push(`category = $${params.length}`); }
  if (search)   { params.push(`%${search}%`);    conditions.push(`(company_name ILIKE $${params.length} OR contact_person ILIKE $${params.length} OR email ILIKE $${params.length})`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const result = await pool.query(
    `SELECT * FROM vendors ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
};

const count = async ({ status, category, search } = {}) => {
  const params = [];
  const conditions = [];

  if (status)   { params.push(status);        conditions.push(`status = $${params.length}`); }
  if (category) { params.push(category);       conditions.push(`category = $${params.length}`); }
  if (search)   { params.push(`%${search}%`);  conditions.push(`(company_name ILIKE $${params.length} OR contact_person ILIKE $${params.length} OR email ILIKE $${params.length})`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`SELECT COUNT(*) FROM vendors ${where}`, params);
  return parseInt(result.rows[0].count);
};

const findById = async (id) => {
  const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const findByUserId = async (userId) => {
  const result = await pool.query('SELECT * FROM vendors WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
};

const create = async ({ user_id, company_name, gst_number, contact_person, email, phone, address, category }) => {
  const result = await pool.query(
    `INSERT INTO vendors (user_id, company_name, gst_number, contact_person, email, phone, address, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [user_id || null, company_name, gst_number, contact_person, email, phone, address, category]
  );
  return result.rows[0];
};

const update = async (id, { company_name, gst_number, contact_person, email, phone, address, category, status }) => {
  const result = await pool.query(
    `UPDATE vendors SET
      company_name = COALESCE($1, company_name),
      gst_number   = COALESCE($2, gst_number),
      contact_person = COALESCE($3, contact_person),
      email        = COALESCE($4, email),
      phone        = COALESCE($5, phone),
      address      = COALESCE($6, address),
      category     = COALESCE($7, category),
      status       = COALESCE($8, status),
      updated_at   = NOW()
     WHERE id = $9 RETURNING *`,
    [company_name, gst_number, contact_person, email, phone, address, category, status, id]
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING id', [id]);
  return result.rows[0] || null;
};

module.exports = { findAll, count, findById, findByUserId, create, update, remove };
