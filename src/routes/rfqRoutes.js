const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllRFQs, getRFQById, createRFQ, updateRFQ, deleteRFQ, assignVendors, publishRFQ, getRFQQRCode } = require('../controllers/rfqController');

router.use(authenticate);

// Admin and manager can view; officer manages; vendor sees assigned RFQs (filtered in controller)
router.get('/', getAllRFQs);
router.get('/:id', getRFQById);

router.post('/', authorize('procurement_officer'), createRFQ);
router.put('/:id', authorize('procurement_officer'), updateRFQ);
router.delete('/:id', authorize('procurement_officer', 'admin'), deleteRFQ);
router.post('/:id/assign-vendors', authorize('procurement_officer'), assignVendors);
router.patch('/:id/publish', authorize('procurement_officer'), publishRFQ);
router.get('/:id/qr', getRFQQRCode);

module.exports = router;
