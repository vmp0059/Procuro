const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllPOs, getPOById, createPO, updatePOStatus } = require('../controllers/purchaseOrderController');

router.use(authenticate);

// All roles can view POs (vendor filtered in controller); manager and admin view only
router.get('/', getAllPOs);
router.get('/:id', getPOById);

// Only officer generates POs; manager cannot
router.post('/', authorize('procurement_officer'), createPO);
router.patch('/:id/status', authorize('procurement_officer', 'admin'), updatePOStatus);

module.exports = router;
