const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getVendorPerformance, getProcurementStats, getMonthlyTrends } = require('../controllers/reportController');

// Only admin and procurement officer access reports; manager does not
router.use(authenticate, authorize('admin', 'procurement_officer'));

router.get('/vendor-performance', getVendorPerformance);
router.get('/procurement-stats', getProcurementStats);
router.get('/monthly-trends', getMonthlyTrends);

module.exports = router;
