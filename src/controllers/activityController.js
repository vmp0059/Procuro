const ActivityLog = require('../models/ActivityLog');

const getActivityLogs = async (req, res, next) => {
  try {
    const { entity_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';

    if (entity_type) { params.push(entity_type); where = `WHERE a.entity_type = $${params.length}`; }

    const [logs, total] = await Promise.all([
      ActivityLog.findAll({ where, params, limit: parseInt(limit), offset: parseInt(offset) }),
      ActivityLog.count({ where, params }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await ActivityLog.findNotificationsByUser(req.user.id);
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await ActivityLog.markNotificationRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    await ActivityLog.markAllNotificationsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivityLogs, getNotifications, markNotificationRead, markAllNotificationsRead };
