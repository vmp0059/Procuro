const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../config/db');

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.warn('⚠️  GEMINI_API_KEY not set — chatbot will not work. Get a key at https://aistudio.google.com/app/apikey');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function fetchContext(topic, id) {
  switch (topic) {
    case 'rfq': {
      const { rows } = await pool.query(
        `SELECT r.*, u.name AS created_by_name FROM rfqs r LEFT JOIN users u ON u.id = r.created_by WHERE r.id = $1`, [id]
      );
      if (!rows.length) return null;
      const rfq = rows[0];
      const { rows: vendors } = await pool.query(`SELECT v.company_name, v.email FROM rfq_vendors rv JOIN vendors v ON v.id = rv.vendor_id WHERE rv.rfq_id = $1`, [id]);
      const { rows: quotations } = await pool.query(`SELECT q.price, q.delivery_days, q.status, v.company_name FROM quotations q JOIN vendors v ON v.id = q.vendor_id WHERE q.rfq_id = $1`, [id]);
      const { rows: approvals } = await pool.query(`SELECT a.status, a.remarks, u.name AS approved_by FROM approvals a LEFT JOIN users u ON u.id = a.approved_by WHERE a.quotation_id IN (SELECT id FROM quotations WHERE rfq_id = $1)`, [id]);
      const { rows: pos } = await pool.query(`SELECT po.po_number, po.status, po.total_amount, v.company_name FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE po.rfq_id = $1`, [id]);
      const { rows: invoices } = await pool.query(`SELECT i.invoice_number, i.status, i.total, i.due_date FROM invoices i JOIN purchase_orders po ON po.id = i.po_id WHERE po.rfq_id = $1`, [id]);
      return { rfq, vendors, quotations, approvals, purchase_orders: pos, invoices };
    }
    case 'vendor': {
      const { rows } = await pool.query(`SELECT * FROM vendors WHERE id = $1`, [id]);
      if (!rows.length) return null;
      const { rows: quotations } = await pool.query(`SELECT q.price, q.delivery_days, q.status, r.title AS rfq_title FROM quotations q JOIN rfqs r ON r.id = q.rfq_id WHERE q.vendor_id = $1 ORDER BY q.created_at DESC LIMIT 10`, [id]);
      const { rows: pos } = await pool.query(`SELECT po_number, status, total_amount FROM purchase_orders WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 5`, [id]);
      return { vendor: rows[0], quotations, purchase_orders: pos };
    }
    case 'quotation': {
      const { rows } = await pool.query(`SELECT q.*, v.company_name, r.title AS rfq_title FROM quotations q JOIN vendors v ON v.id = q.vendor_id JOIN rfqs r ON r.id = q.rfq_id WHERE q.id = $1`, [id]);
      if (!rows.length) return null;
      const { rows: approval } = await pool.query(`SELECT a.status, a.remarks, u.name AS approved_by FROM approvals a LEFT JOIN users u ON u.id = a.approved_by WHERE a.quotation_id = $1`, [id]);
      return { quotation: rows[0], approval: approval[0] || null };
    }
    case 'purchase_order': {
      const { rows } = await pool.query(`SELECT po.*, v.company_name FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE po.id = $1`, [id]);
      if (!rows.length) return null;
      const { rows: invoices } = await pool.query(`SELECT invoice_number, status, total, due_date FROM invoices WHERE po_id = $1`, [id]);
      return { purchase_order: rows[0], invoices };
    }
    case 'invoice': {
      const { rows } = await pool.query(`SELECT i.*, v.company_name, po.po_number FROM invoices i JOIN vendors v ON v.id = i.vendor_id JOIN purchase_orders po ON po.id = i.po_id WHERE i.id = $1`, [id]);
      return rows.length ? { invoice: rows[0] } : null;
    }
    case 'summary': {
      const { rows: rfqs } = await pool.query(`SELECT status, COUNT(*) as count FROM rfqs GROUP BY status`);
      const { rows: vendors } = await pool.query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status='active' THEN 1 END) as active FROM vendors`);
      const { rows: spend } = await pool.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM purchase_orders WHERE status NOT IN ('cancelled')`);
      const { rows: pending } = await pool.query(`SELECT COUNT(*) as count FROM approvals WHERE status='pending'`);
      return { rfq_stats: rfqs, vendor_stats: vendors[0], total_spend: spend[0].total, pending_approvals: pending[0].count };
    }
    default:
      return null;
  }
}

async function listItems(topic) {
  switch (topic) {
    case 'rfq':
      return (await pool.query(`SELECT id, title, status, deadline FROM rfqs ORDER BY created_at DESC LIMIT 20`)).rows;
    case 'vendor':
      return (await pool.query(`SELECT id, company_name, category, status FROM vendors ORDER BY created_at DESC LIMIT 20`)).rows;
    case 'quotation':
      return (await pool.query(`SELECT q.id, v.company_name AS vendor, r.title AS rfq, q.price, q.status FROM quotations q JOIN vendors v ON v.id = q.vendor_id JOIN rfqs r ON r.id = q.rfq_id ORDER BY q.created_at DESC LIMIT 20`)).rows;
    case 'purchase_order':
      return (await pool.query(`SELECT po.id, po.po_number, v.company_name AS vendor, po.total_amount, po.status FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id ORDER BY po.created_at DESC LIMIT 20`)).rows;
    case 'invoice':
      return (await pool.query(`SELECT i.id, i.invoice_number, v.company_name AS vendor, i.total, i.status FROM invoices i JOIN vendors v ON v.id = i.vendor_id ORDER BY i.created_at DESC LIMIT 20`)).rows;
    default:
      return [];
  }
}

async function chat(history, userMessage, topic, selectedId) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw Object.assign(new Error('Gemini API key not configured'), { isApiKeyError: true });
  }
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let contextBlock = '';
  if (selectedId && topic) {
    const ctx = await fetchContext(topic, selectedId);
    contextBlock = ctx
      ? `\n\nCurrent context (${topic} data from DB):\n${JSON.stringify(ctx, null, 2)}`
      : `\n\nNo data found for ${topic} id: ${selectedId}`;
  } else if (topic === 'summary') {
    const ctx = await fetchContext('summary', null);
    contextBlock = `\n\nSystem summary:\n${JSON.stringify(ctx, null, 2)}`;
  }

  const systemPrompt = `You are a helpful assistant for VendorBridge, a procurement management system.
You help users understand procurement data including RFQs, quotations, approvals, purchase orders, invoices, and vendors.
Answer concisely. Format numbers as Indian Rupees (₹) where relevant. If asked about specific data, reference the context provided.
Do not make up data — only use what is in the context.${contextBlock}`;

  const geminiHistory = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chatSession = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am ready to help with VendorBridge procurement data.' }] },
      ...geminiHistory,
    ],
  });

  const result = await chatSession.sendMessage(userMessage);
  return result.response.text();
}

module.exports = { chat, listItems };
