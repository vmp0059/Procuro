const Vendor = require('../models/Vendor');
const logActivity = require('../utils/activityLogger');

const getAllVendors = async (req, res, next) => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [vendors, total] = await Promise.all([
      Vendor.findAll({ status, category, search, limit: parseInt(limit), offset: parseInt(offset) }),
      Vendor.count({ status, category, search }),
    ]);

    res.json({
      success: true,
      data: vendors,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

const createVendor = async (req, res, next) => {
  try {
    const { company_name, gst_number, contact_person, email, phone, address, category, user_id } = req.body;
    const vendor = await Vendor.create({ user_id, company_name, gst_number, contact_person, email, phone, address, category });

    await logActivity(req.user.id, 'VENDOR_CREATED', 'vendor', vendor.id);
    res.status(201).json({ success: true, message: 'Vendor created', data: vendor });
  } catch (err) {
    next(err);
  }
};

const updateVendor = async (req, res, next) => {
  try {
    const { company_name, gst_number, contact_person, email, phone, address, category, status } = req.body;
    const vendor = await Vendor.update(req.params.id, { company_name, gst_number, contact_person, email, phone, address, category, status });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    await logActivity(req.user.id, 'VENDOR_UPDATED', 'vendor', req.params.id);
    res.json({ success: true, message: 'Vendor updated', data: vendor });
  } catch (err) {
    next(err);
  }
};

const deleteVendor = async (req, res, next) => {
  try {
    const deleted = await Vendor.remove(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Vendor not found' });

    await logActivity(req.user.id, 'VENDOR_DELETED', 'vendor', req.params.id);
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (err) {
    next(err);
  }
};

const getVendorProfile = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByUserId(req.user.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    res.json({ success: true, data: vendor });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor, getVendorProfile };
