const Quotation = require('../models/Quotation');
const Vendor = require('../models/Vendor');
const logActivity = require('../utils/activityLogger');

const getQuotationsByRFQ = async (req, res, next) => {
  try {
    const quotations = await Quotation.findByRFQ(req.params.rfqId);
    res.json({ success: true, data: quotations });
  } catch (err) {
    next(err);
  }
};

const getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    res.json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
};

const submitQuotation = async (req, res, next) => {
  try {
    const { rfq_id, price, delivery_days, notes } = req.body;

    const vendor = await Vendor.findByUserId(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });

    const isAssigned = await require('../models/RFQ').isVendorAssigned(rfq_id, vendor.id);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'You are not invited to this RFQ' });
    }

    const existing = await Quotation.findExisting(rfq_id, vendor.id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Quotation already submitted for this RFQ. Use update instead.' });
    }

    const quotation = await Quotation.create({ rfq_id, vendor_id: vendor.id, price, delivery_days, notes });

    await logActivity(req.user.id, 'QUOTATION_SUBMITTED', 'quotation', quotation.id);
    res.status(201).json({ success: true, message: 'Quotation submitted', data: quotation });
  } catch (err) {
    next(err);
  }
};

const updateQuotation = async (req, res, next) => {
  try {
    const { price, delivery_days, notes } = req.body;

    const vendor = await Vendor.findByUserId(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });

    const quotation = await Quotation.update(req.params.id, vendor.id, { price, delivery_days, notes });
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found, unauthorized, or already processed' });
    }

    await logActivity(req.user.id, 'QUOTATION_UPDATED', 'quotation', req.params.id);
    res.json({ success: true, message: 'Quotation updated', data: quotation });
  } catch (err) {
    next(err);
  }
};

const compareQuotations = async (req, res, next) => {
  try {
    const [quotations, rfq] = await Promise.all([
      Quotation.compareByRFQ(req.params.rfqId),
      Quotation.findByIdForRFQ(req.params.rfqId),
    ]);
    res.json({ success: true, data: { rfq, quotations } });
  } catch (err) {
    next(err);
  }
};

const getMyQuotations = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByUserId(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });

    const quotations = await Quotation.findByVendor(vendor.id);
    res.json({ success: true, data: quotations });
  } catch (err) {
    next(err);
  }
};

module.exports = { getQuotationsByRFQ, getQuotationById, submitQuotation, updateQuotation, compareQuotations, getMyQuotations };
