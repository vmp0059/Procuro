const PurchaseOrder = require('../models/PurchaseOrder');
const Quotation = require('../models/Quotation');
const RFQ = require('../models/RFQ');
const Vendor = require('../models/Vendor');
const { generatePONumber } = require('../utils/generateNumber');
const logActivity = require('../utils/activityLogger');

const getAllPOs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';

    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findByUserId(req.user.id);
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      params.push(vendor.id);
      where = `WHERE po.vendor_id = $${params.length}`;
      if (status) { params.push(status); where += ` AND po.status = $${params.length}`; }
    } else if (status) {
      params.push(status);
      where = `WHERE po.status = $${params.length}`;
    }

    const pos = await PurchaseOrder.findAll({ where, params, limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: pos });
  } catch (err) {
    next(err);
  }
};

const getPOById = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    res.json({ success: true, data: po });
  } catch (err) {
    next(err);
  }
};

const createPO = async (req, res, next) => {
  try {
    const { quotation_id, notes } = req.body;

    const quotation = await Quotation.findAccepted(quotation_id);
    if (!quotation) {
      return res.status(400).json({ success: false, message: 'Quotation not found or not accepted' });
    }

    const poNumber = generatePONumber();
    const po = await PurchaseOrder.create({
      quotation_id,
      po_number: poNumber,
      vendor_id: quotation.vendor_id,
      rfq_id: quotation.rfq_id,
      total_amount: quotation.price,
      notes,
      created_by: req.user.id,
    });

    await RFQ.setAwarded(quotation.rfq_id);

    await logActivity(req.user.id, 'PURCHASE_ORDER_CREATED', 'purchase_order', po.id, { po_number: poNumber });
    res.status(201).json({ success: true, message: 'Purchase order created', data: po });
  } catch (err) {
    next(err);
  }
};

const updatePOStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const po = await PurchaseOrder.updateStatus(req.params.id, status);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    await logActivity(req.user.id, 'PO_STATUS_UPDATED', 'purchase_order', req.params.id, { status });
    res.json({ success: true, message: 'PO status updated', data: po });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllPOs, getPOById, createPO, updatePOStatus };
