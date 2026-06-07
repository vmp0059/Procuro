const pool = require('../config/db');
const RFQ = require('../models/RFQ');
const Vendor = require('../models/Vendor');
const logActivity = require('../utils/activityLogger');

const getAllRFQs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';

    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findByUserId(req.user.id);
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      params.push(vendor.id);
      where = `WHERE r.id IN (SELECT rfq_id FROM rfq_vendors WHERE vendor_id = $${params.length})`;
      if (status) { params.push(status); where += ` AND r.status = $${params.length}`; }
    } else if (status) {
      params.push(status);
      where = `WHERE r.status = $${params.length}`;
    }

    const [rfqs, total] = await Promise.all([
      RFQ.findAll({ where, params, limit: parseInt(limit), offset: parseInt(offset) }),
      RFQ.count({ where, params }),
    ]);

    res.json({
      success: true,
      data: rfqs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getRFQById = async (req, res, next) => {
  try {
    const rfq = await RFQ.findById(req.params.id);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found' });

    const [vendors, items] = await Promise.all([
      RFQ.findVendorsByRFQId(req.params.id),
      RFQ.findItemsByRFQId(req.params.id),
    ]);

    res.json({ success: true, data: { ...rfq, vendors, items } });
  } catch (err) {
    next(err);
  }
};

const createRFQ = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, description, quantity, unit, deadline, vendor_ids = [], items = [] } = req.body;

    const rfq = await RFQ.create(client, { title, description, quantity, unit, deadline, created_by: req.user.id });

    await Promise.all([
      ...vendor_ids.map((vid) => RFQ.addVendor(client, rfq.id, vid)),
      ...items.map((item) => RFQ.addItem(client, rfq.id, item)),
    ]);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'RFQ_CREATED', 'rfq', rfq.id);
    res.status(201).json({ success: true, message: 'RFQ created', data: rfq });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const updateRFQ = async (req, res, next) => {
  try {
    const { title, description, quantity, unit, deadline, status } = req.body;
    const rfq = await RFQ.update(req.params.id, req.user.id, { title, description, quantity, unit, deadline, status });
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found or unauthorized' });

    await logActivity(req.user.id, 'RFQ_UPDATED', 'rfq', req.params.id);
    res.json({ success: true, message: 'RFQ updated', data: rfq });
  } catch (err) {
    next(err);
  }
};

const deleteRFQ = async (req, res, next) => {
  try {
    const deleted = await RFQ.remove(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'RFQ not found or unauthorized' });

    await logActivity(req.user.id, 'RFQ_DELETED', 'rfq', req.params.id);
    res.json({ success: true, message: 'RFQ deleted' });
  } catch (err) {
    next(err);
  }
};

const assignVendors = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { vendor_ids } = req.body;
    await Promise.all(vendor_ids.map((vid) => RFQ.addVendor(client, req.params.id, vid)));
    await client.query('COMMIT');

    await logActivity(req.user.id, 'VENDORS_ASSIGNED', 'rfq', req.params.id, { vendor_ids });
    res.json({ success: true, message: 'Vendors assigned to RFQ' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const publishRFQ = async (req, res, next) => {
  try {
    const rfq = await RFQ.publish(req.params.id, req.user.id);
    if (!rfq) return res.status(404).json({ success: false, message: 'RFQ not found or unauthorized' });

    await logActivity(req.user.id, 'RFQ_PUBLISHED', 'rfq', req.params.id);
    res.json({ success: true, message: 'RFQ published', data: rfq });
  } catch (err) {
    next(err);
  }
};

const getRFQQRCode = async (req, res, next) => {
  try {
    const { generateRFQQR } = require('../utils/rfqQR');
    const result = await generateRFQQR(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'RFQ not found' });

    if (req.query.format === 'json') {
      return res.json({ success: true, data: result.snapshot });
    }

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="rfq-${req.params.id}-qr.png"`);
    res.send(result.png);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllRFQs, getRFQById, createRFQ, updateRFQ, deleteRFQ, assignVendors, publishRFQ, getRFQQRCode };
