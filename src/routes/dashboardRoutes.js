const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getDashboard, getVendorDashboard } = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/', authorize('admin', 'procurement_officer', 'manager'), getDashboard);
router.get('/vendor', authorize('vendor'), getVendorDashboard);

module.exports = router;
