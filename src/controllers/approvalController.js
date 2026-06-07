const Approval = require('../models/Approval');
const Quotation = require('../models/Quotation');
const logActivity = require('../utils/activityLogger');

const getAllApprovals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';

    if (status) { params.push(status); where = `WHERE a.status = $${params.length}`; }

    const approvals = await Approval.findAll({ where, params, limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: approvals });
  } catch (err) {
    next(err);
  }
};

const getApprovalById = async (req, res, next) => {
  try {
    const approval = await Approval.findById(req.params.id);
    if (!approval) return res.status(404).json({ success: false, message: 'Approval not found' });
    res.json({ success: true, data: approval });
  } catch (err) {
    next(err);
  }
};

const requestApproval = async (req, res, next) => {
  try {
    const { quotation_id } = req.body;

    const quotation = await Quotation.findStatusById(quotation_id);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });
    if (quotation.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Quotation must be submitted before requesting approval' });
    }

    const existing = await Approval.findByQuotation(quotation_id);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Approval already requested for this quotation' });
    }

    const approval = await Approval.create(quotation_id);

    await logActivity(req.user.id, 'APPROVAL_REQUESTED', 'approval', approval.id);
    res.status(201).json({ success: true, message: 'Approval requested', data: approval });
  } catch (err) {
    next(err);
  }
};

const processApproval = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const approval = await Approval.process(req.params.id, { status, remarks, approvedBy: req.user.id });
    if (!approval) {
      return res.status(404).json({ success: false, message: 'Approval not found or already processed' });
    }

    const quotationStatus = status === 'approved' ? 'accepted' : 'rejected';
    await Quotation.updateStatus(approval.quotation_id, quotationStatus);

    if (status === 'approved') {
      await Quotation.rejectOthersForRFQ(approval.quotation_id);
    }

    await logActivity(req.user.id, `APPROVAL_${status.toUpperCase()}`, 'approval', req.params.id, { remarks });
    res.json({ success: true, message: `Approval ${status}`, data: approval });
  } catch (err) {
    next(err);
  }
};

// Manager/admin: approve or reject a quotation directly (auto-creates approval record if needed)
const processQuotationDirect = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const { quotationId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });
    }

    const quotation = await Quotation.findStatusById(quotationId);
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' });

    // Auto-create approval record if it doesn't exist yet
    let approval = await Approval.findByQuotation(quotationId);
    if (!approval) {
      approval = await Approval.create(quotationId);
    } else if (approval.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Quotation already ${approval.status}` });
    }

    const processed = await Approval.process(approval.id, { status, remarks, approvedBy: req.user.id });
    if (!processed) {
      return res.status(400).json({ success: false, message: 'Approval already processed' });
    }

    const quotationStatus = status === 'approved' ? 'accepted' : 'rejected';
    await Quotation.updateStatus(quotationId, quotationStatus);

    if (status === 'approved') {
      await Quotation.rejectOthersForRFQ(quotationId);
    }

    await logActivity(req.user.id, `APPROVAL_${status.toUpperCase()}`, 'approval', processed.id, { remarks });
    res.json({ success: true, message: `Quotation ${status}`, data: processed });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllApprovals, getApprovalById, requestApproval, processApproval, processQuotationDirect };
