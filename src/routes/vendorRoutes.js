const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getAllVendors, getVendorById, createVendor, updateVendor, deleteVendor, getVendorProfile } = require('../controllers/vendorController');

router.use(authenticate);

router.get('/profile', authorize('vendor'), getVendorProfile);

// Manager gets view-only access; officer gets view; admin manages
router.get('/', getAllVendors);
router.get('/:id', getVendorById);

router.post('/', authorize('admin', 'procurement_officer'), createVendor);
router.put('/:id', authorize('admin', 'procurement_officer'), updateVendor);
router.delete('/:id', authorize('admin'), deleteVendor);

module.exports = router;
