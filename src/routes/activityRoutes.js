const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getActivityLogs, getNotifications, markNotificationRead, markAllNotificationsRead } = require('../controllers/activityController');

router.use(authenticate);

// Only admin reviews audit logs
router.get('/logs', authorize('admin'), getActivityLogs);

// All authenticated users can manage their own notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.patch('/notifications/read-all', markAllNotificationsRead);

module.exports = router;
