const pool = require('../config/db');

const getVendorPerformance = async () => {
  const result = await pool.query(
    `SELECT v.id, v.company_name, v.category, v.rating,
      COUNT(DISTINCT q.rfq_id) as rfqs_participated,
      COUNT(DISTINCT CASE WHEN q.status = 'accepted' THEN q.id END) as quotations_won,
      COALESCE(AVG(q.price), 0) as avg_price,
      COALESCE(AVG(q.delivery_days), 0) as avg_delivery_days,
      COUNT(DISTINCT po.id) as purchase_orders
     FROM vendors v
     LEFT JOIN quotations q ON v.id = q.vendor_id
     LEFT JOIN purchase_orders po ON v.id = po.vendor_id
     GROUP BY v.id
     ORDER BY quotations_won DESC`
  );
  return result.rows;
};

const getProcurementStats = async ({ from, to } = {}) => {
  const params = [];
  let dateFilter = '';
  if (from && to) { params.push(from, to); dateFilter = 'WHERE created_at BETWEEN $1 AND $2'; }

  const [rfqStats, poStats, invoiceStats, topVendors] = await Promise.all([
    pool.query(`SELECT status, COUNT(*) as count FROM rfqs ${dateFilter} GROUP BY status`, params),
    pool.query(`SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value FROM purchase_orders ${dateFilter} GROUP BY status`, params),
    pool.query(`SELECT status, COUNT(*) as count, COALESCE(SUM(total), 0) as total_value FROM invoices ${dateFilter} GROUP BY status`, params),
    pool.query(
      `SELECT v.company_name, COUNT(po.id) as order_count, COALESCE(SUM(po.total_amount), 0) as total_value
       FROM vendors v
       JOIN purchase_orders po ON v.id = po.vendor_id
       GROUP BY v.id ORDER BY total_value DESC LIMIT 10`
    ),
  ]);

  return {
    rfq_stats: rfqStats.rows,
    po_stats: poStats.rows,
    invoice_stats: invoiceStats.rows,
    top_vendors: topVendors.rows,
  };
};

const getMonthlyTrends = async () => {
  const [rfqTrend, spendTrend] = await Promise.all([
    pool.query(
      `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as rfq_count
       FROM rfqs WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`
    ),
    pool.query(
      `SELECT DATE_TRUNC('month', created_at) as month, COALESCE(SUM(total), 0) as total_spend
       FROM invoices WHERE status = 'paid' AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month ASC`
    ),
  ]);
  return { rfq_trend: rfqTrend.rows, spend_trend: spendTrend.rows };
};

const getDashboardKPIs = async () => {
  const [totalVendors, openRFQs, pendingApprovals, activePOs, monthlySpend, pendingInvoices] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM vendors WHERE status = 'active'`),
    pool.query(`SELECT COUNT(*) FROM rfqs WHERE status IN ('open', 'published')`),
    pool.query(`SELECT COUNT(*) FROM approvals WHERE status = 'pending'`),
    pool.query(`SELECT COUNT(*) FROM purchase_orders WHERE status NOT IN ('completed', 'cancelled')`),
    pool.query(`SELECT COALESCE(SUM(total), 0) as spend FROM invoices WHERE status = 'paid' AND created_at >= DATE_TRUNC('month', NOW())`),
    pool.query(`SELECT COUNT(*) FROM invoices WHERE status = 'issued'`),
  ]);
  return {
    total_vendors: parseInt(totalVendors.rows[0].count),
    active_rfqs: parseInt(openRFQs.rows[0].count),
    pending_approvals: parseInt(pendingApprovals.rows[0].count),
    active_pos: parseInt(activePOs.rows[0].count),
    monthly_spend: parseFloat(monthlySpend.rows[0].spend),
    pending_invoices: parseInt(pendingInvoices.rows[0].count),
  };
};

const AUTH_ACTIONS = ['USER_LOGIN', 'USER_REGISTERED', 'PASSWORD_CHANGED'];

const getRecentActivity = async ({ excludeAuth = false } = {}) => {
  const where = excludeAuth
    ? `WHERE al.action NOT IN (${AUTH_ACTIONS.map((_, i) => `$${i + 1}`).join(', ')})`
    : '';
  const params = excludeAuth ? AUTH_ACTIONS : [];
  const result = await pool.query(
    `SELECT al.id, al.action, al.entity_type, al.created_at, u.name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ${where}
     ORDER BY al.created_at DESC LIMIT 15`,
    params
  );
  return { recent_activity: result.rows };
};

const getVendorKPIs = async (vendorId) => {
  const [total, accepted, pending, revenue] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM quotations WHERE vendor_id = $1`, [vendorId]),
    pool.query(`SELECT COUNT(*) FROM quotations WHERE vendor_id = $1 AND status = 'accepted'`, [vendorId]),
    pool.query(`SELECT COUNT(*) FROM quotations WHERE vendor_id = $1 AND status = 'submitted'`, [vendorId]),
    pool.query(`SELECT COALESCE(SUM(total), 0) as rev FROM invoices WHERE vendor_id = $1 AND status = 'paid'`, [vendorId]),
  ]);
  return {
    total_quotations: parseInt(total.rows[0].count),
    accepted_quotations: parseInt(accepted.rows[0].count),
    pending_quotations: parseInt(pending.rows[0].count),
    total_revenue: parseFloat(revenue.rows[0].rev),
  };
};

const getVendorRecentQuotations = async (vendorId) => {
  const result = await pool.query(
    `SELECT q.*, r.title as rfq_title FROM quotations q
     JOIN rfqs r ON q.rfq_id = r.id
     WHERE q.vendor_id = $1 ORDER BY q.created_at DESC LIMIT 5`,
    [vendorId]
  );
  return result.rows;
};

module.exports = {
  getVendorPerformance, getProcurementStats, getMonthlyTrends,
  getDashboardKPIs, getRecentActivity, getVendorKPIs, getVendorRecentQuotations,
};
