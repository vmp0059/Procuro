const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllApprovals, getApprovalById, requestApproval, processApproval, processQuotationDirect } = require('../controllers/approvalController');

router.use(authenticate);

// Manager and admin can view all approvals; officer can also view to track status
router.get('/', authorize('manager', 'admin', 'procurement_officer'), getAllApprovals);
router.get('/:id', authorize('manager', 'admin', 'procurement_officer'), getApprovalById);

// Only procurement officer initiates the approval request
router.post('/', authorize('procurement_officer'), requestApproval);

// Only manager (and admin for emergencies) can approve/reject
router.patch('/:id/process', authorize('manager', 'admin'), processApproval);

// Direct approve/reject a quotation by quotation ID (auto-creates approval record)
router.patch('/quotation/:quotationId/process', authorize('manager', 'admin'), processQuotationDirect);

module.exports = router;
