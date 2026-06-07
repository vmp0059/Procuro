const pool = require('../config/db');

const findAll = async ({ where = '', params = [], limit, offset }) => {
  params = [...params, limit, offset];
  const result = await pool.query(
    `SELECT r.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM rfq_vendors WHERE rfq_id = r.id) as vendor_count,
      (SELECT COUNT(*) FROM quotations WHERE rfq_id = r.id) as quotation_count
     FROM rfqs r
     LEFT JOIN users u ON r.created_by = u.id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
};

const count = async ({ where = '', params = [] } = {}) => {
  const result = await pool.query(`SELECT COUNT(*) FROM rfqs r ${where}`, params);
  return parseInt(result.rows[0].count);
};

const findById = async (id) => {
  const result = await pool.query(
    `SELECT r.*, u.name as created_by_name FROM rfqs r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findVendorsByRFQId = async (rfqId) => {
  const result = await pool.query(
    `SELECT v.*, rv.invited_at FROM vendors v
     JOIN rfq_vendors rv ON v.id = rv.vendor_id
     WHERE rv.rfq_id = $1`,
    [rfqId]
  );
  return result.rows;
};

const findItemsByRFQId = async (rfqId) => {
  const result = await pool.query('SELECT * FROM rfq_items WHERE rfq_id = $1', [rfqId]);
  return result.rows;
};

const create = async (client, { title, description, quantity, unit, deadline, created_by }) => {
  const result = await client.query(
    `INSERT INTO rfqs (title, description, quantity, unit, deadline, status, created_by)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6) RETURNING *`,
    [title, description, quantity, unit, deadline, created_by]
  );
  return result.rows[0];
};

const addVendor = async (client, rfqId, vendorId) => {
  await client.query(
    'INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [rfqId, vendorId]
  );
};

const addItem = async (client, rfqId, { item_name, quantity, unit, description }) => {
  await client.query(
    'INSERT INTO rfq_items (rfq_id, item_name, quantity, unit, description) VALUES ($1, $2, $3, $4, $5)',
    [rfqId, item_name, quantity, unit, description]
  );
};

const update = async (id, createdBy, { title, description, quantity, unit, deadline, status }) => {
  const result = await pool.query(
    `UPDATE rfqs SET
      title       = COALESCE($1, title),
      description = COALESCE($2, description),
      quantity    = COALESCE($3, quantity),
      unit        = COALESCE($4, unit),
      deadline    = COALESCE($5, deadline),
      status      = COALESCE($6, status),
      updated_at  = NOW()
     WHERE id = $7 AND created_by = $8 RETURNING *`,
    [title, description, quantity, unit, deadline, status, id, createdBy]
  );
  return result.rows[0] || null;
};

const publish = async (id, createdBy) => {
  const result = await pool.query(
    `UPDATE rfqs SET status = 'open', updated_at = NOW() WHERE id = $1 AND created_by = $2 RETURNING *`,
    [id, createdBy]
  );
  return result.rows[0] || null;
};

const setAwarded = async (id) => {
  await pool.query(`UPDATE rfqs SET status = 'awarded', updated_at = NOW() WHERE id = $1`, [id]);
};

const remove = async (id, createdBy) => {
  const result = await pool.query(
    'DELETE FROM rfqs WHERE id = $1 AND created_by = $2 RETURNING id',
    [id, createdBy]
  );
  return result.rows[0] || null;
};

const isVendorAssigned = async (rfqId, vendorId) => {
  const result = await pool.query(
    'SELECT id FROM rfq_vendors WHERE rfq_id = $1 AND vendor_id = $2',
    [rfqId, vendorId]
  );
  return result.rows.length > 0;
};

module.exports = {
  findAll, count, findById, findVendorsByRFQId, findItemsByRFQId,
  create, addVendor, addItem, update, publish, setAwarded, remove, isVendorAssigned,
};
