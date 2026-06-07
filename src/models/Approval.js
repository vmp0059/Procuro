const pool = require('../config/db');

const findAll = async ({ where = '', params = [], limit, offset }) => {
  params = [...params, limit, offset];
  const result = await pool.query(
    `SELECT a.*, q.price, q.delivery_days, q.rfq_id,
      r.title as rfq_title, v.company_name, u.name as approved_by_name
     FROM approvals a
     JOIN quotations q ON a.quotation_id = q.id
     JOIN rfqs r ON q.rfq_id = r.id
     JOIN vendors v ON q.vendor_id = v.id
     LEFT JOIN users u ON a.approved_by = u.id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query(
    `SELECT a.*, q.price, q.delivery_days, q.notes, q.rfq_id,
      r.title as rfq_title, v.company_name, v.contact_person,
      u.name as approved_by_name
     FROM approvals a
     JOIN quotations q ON a.quotation_id = q.id
     JOIN rfqs r ON q.rfq_id = r.id
     JOIN vendors v ON q.vendor_id = v.id
     LEFT JOIN users u ON a.approved_by = u.id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByQuotation = async (quotationId) => {
  const result = await pool.query('SELECT id, status FROM approvals WHERE quotation_id = $1', [quotationId]);
  return result.rows[0] || null;
};

const create = async (quotationId) => {
  const result = await pool.query(
    `INSERT INTO approvals (quotation_id, status) VALUES ($1, 'pending') RETURNING *`,
    [quotationId]
  );
  return result.rows[0];
};

const process = async (id, { status, remarks, approvedBy }) => {
  const result = await pool.query(
    `UPDATE approvals SET status = $1, remarks = $2, approved_by = $3, updated_at = NOW()
     WHERE id = $4 AND status = 'pending' RETURNING *`,
    [status, remarks, approvedBy, id]
  );
  return result.rows[0] || null;
};

module.exports = { findAll, findById, findByQuotation, create, process };
