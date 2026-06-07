const pool = require('../config/db');

const findAll = async ({ where = '', params = [], limit, offset }) => {
  params = [...params, limit, offset];
  const result = await pool.query(
    `SELECT i.*, v.company_name, po.po_number
     FROM invoices i
     LEFT JOIN vendors v ON i.vendor_id = v.id
     LEFT JOIN purchase_orders po ON i.po_id = po.id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query(
    `SELECT i.*, v.company_name, v.gst_number, v.address, v.contact_person, po.po_number
     FROM invoices i
     LEFT JOIN vendors v ON i.vendor_id = v.id
     LEFT JOIN purchase_orders po ON i.po_id = po.id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByIdForPDF = async (id) => {
  const result = await pool.query(
    `SELECT i.*, v.company_name, v.gst_number, v.address, v.contact_person,
      v.email as vendor_email, po.po_number
     FROM invoices i
     LEFT JOIN vendors v ON i.vendor_id = v.id
     LEFT JOIN purchase_orders po ON i.po_id = po.id
     WHERE i.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async ({ po_id, invoice_number, vendor_id, subtotal, tax, total, due_date }) => {
  const result = await pool.query(
    `INSERT INTO invoices (po_id, invoice_number, vendor_id, subtotal, tax, total, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent') RETURNING *`,
    [po_id, invoice_number, vendor_id, subtotal, tax, total, due_date]
  );
  return result.rows[0];
};

const updateStatus = async (id, status) => {
  const result = await pool.query(
    `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0] || null;
};

module.exports = { findAll, findById, findByIdForPDF, create, updateStatus };
