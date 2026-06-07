const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const { generateInvoiceNumber } = require('../utils/generateNumber');
const logActivity = require('../utils/activityLogger');

const getAllInvoices = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = '';

    if (req.user.role === 'vendor') {
      const vendor = await Vendor.findByUserId(req.user.id);
      if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found' });
      params.push(vendor.id);
      where = `WHERE i.vendor_id = $${params.length}`;
      if (status) { params.push(status); where += ` AND i.status = $${params.length}`; }
    } else if (status) {
      params.push(status);
      where = `WHERE i.status = $${params.length}`;
    }

    const invoices = await Invoice.findAll({ where, params, limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const { po_id, subtotal, tax = 0, due_date } = req.body;

    const po = await PurchaseOrder.findRawById(po_id);
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });

    const total = parseFloat(subtotal) + parseFloat(tax);
    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      po_id,
      invoice_number: invoiceNumber,
      vendor_id: po.vendor_id,
      subtotal,
      tax,
      total,
      due_date,
    });

    await logActivity(req.user.id, 'INVOICE_CREATED', 'invoice', invoice.id, { invoice_number: invoiceNumber });
    res.status(201).json({ success: true, message: 'Invoice created', data: invoice });
  } catch (err) {
    next(err);
  }
};

const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.updateStatus(req.params.id, status);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await logActivity(req.user.id, 'INVOICE_STATUS_UPDATED', 'invoice', req.params.id, { status });
    res.json({ success: true, message: 'Invoice status updated', data: invoice });
  } catch (err) {
    next(err);
  }
};

const downloadInvoicePDF = async (req, res, next) => {
  try {
    const inv = await Invoice.findByIdForPDF(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${inv.invoice_number}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica');

    doc.text(`Invoice Number: ${inv.invoice_number}`);
    doc.text(`PO Number: ${inv.po_number || 'N/A'}`);
    doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString()}`);
    doc.text(`Due Date: ${inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Vendor Details:');
    doc.font('Helvetica');
    doc.text(`Company: ${inv.company_name}`);
    doc.text(`Contact: ${inv.contact_person}`);
    doc.text(`GST: ${inv.gst_number || 'N/A'}`);
    doc.text(`Email: ${inv.vendor_email}`);
    doc.text(`Address: ${inv.address || 'N/A'}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Amount Summary:');
    doc.font('Helvetica');
    doc.text(`Subtotal: INR${parseFloat(inv.subtotal).toFixed(2)}`);
    doc.text(`Tax: INR${parseFloat(inv.tax).toFixed(2)}`);
    doc.font('Helvetica-Bold').text(`Total: INR${parseFloat(inv.total).toFixed(2)}`);
    doc.moveDown();
    doc.font('Helvetica').text(`Status: ${inv.status.toUpperCase()}`);

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllInvoices, getInvoiceById, createInvoice, updateInvoiceStatus, downloadInvoicePDF };
