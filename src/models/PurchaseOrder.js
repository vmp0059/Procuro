const pool = require('../config/db');

const findAll = async ({ where = '', params = [], limit, offset }) => {
  params = [...params, limit, offset];
  const result = await pool.query(
    `SELECT po.*, v.company_name, r.title as rfq_title, u.name as created_by_name
     FROM purchase_orders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     LEFT JOIN rfqs r ON po.rfq_id = r.id
     LEFT JOIN users u ON po.created_by = u.id
     ${where}
     ORDER BY po.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query(
    `SELECT po.*, v.company_name, v.contact_person, v.email as vendor_email, v.gst_number,
      r.title as rfq_title, r.description, r.quantity,
      q.price, q.delivery_days, u.name as created_by_name
     FROM purchase_orders po
     LEFT JOIN vendors v ON po.vendor_id = v.id
     LEFT JOIN rfqs r ON po.rfq_id = r.id
     LEFT JOIN quotations q ON po.quotation_id = q.id
     LEFT JOIN users u ON po.created_by = u.id
     WHERE po.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findRawById = async (id) => {
  const result = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const create = async ({ quotation_id, po_number, vendor_id, rfq_id, total_amount, notes, created_by }) => {
  const result = await pool.query(
    `INSERT INTO purchase_orders (quotation_id, po_number, vendor_id, rfq_id, total_amount, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [quotation_id, po_number, vendor_id, rfq_id, total_amount, notes, created_by]
  );
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
};

module.exports = { findAll, findById, findRawById, create, updateStatus };
