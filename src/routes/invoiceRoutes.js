const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, downloadInvoicePDF } = require('../controllers/invoiceController');

router.use(authenticate);

// All roles can view invoices (vendor filtered in controller); manager and admin view only
router.get('/', getAllInvoices);
router.get('/:id', getInvoiceById);
router.get('/:id/download', downloadInvoicePDF);

// Only officer generates invoices; manager cannot
router.post('/', authorize('procurement_officer'), createInvoice);
router.patch('/:id/status', authorize('procurement_officer', 'manager', 'admin'), updateInvoiceStatus);

module.exports = router;
