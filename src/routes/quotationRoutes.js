const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getQuotationsByRFQ, getQuotationById, submitQuotation,
  updateQuotation, compareQuotations, getMyQuotations,
} = require('../controllers/quotationController');

router.use(authenticate);

router.get('/my', authorize('vendor'), getMyQuotations);

// Officer, manager, and admin can view and compare quotations
router.get('/rfq/:rfqId', authorize('procurement_officer', 'manager', 'admin'), getQuotationsByRFQ);
router.get('/rfq/:rfqId/compare', authorize('procurement_officer', 'manager', 'admin'), compareQuotations);
router.get('/:id', authorize('procurement_officer', 'manager', 'admin', 'vendor'), getQuotationById);

router.post('/', authorize('vendor'), submitQuotation);
router.put('/:id', authorize('vendor'), updateQuotation);

module.exports = router;
