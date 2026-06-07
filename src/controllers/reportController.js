const Report = require('../models/Report');

const getVendorPerformance = async (req, res, next) => {
  try {
    const data = await Report.getVendorPerformance();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getProcurementStats = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const data = await Report.getProcurementStats({ from, to });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getMonthlyTrends = async (req, res, next) => {
  try {
    const data = await Report.getMonthlyTrends();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getVendorPerformance, getProcurementStats, getMonthlyTrends };
