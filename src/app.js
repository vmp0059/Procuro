const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const rfqRoutes = require('./routes/rfqRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const activityRoutes = require('./routes/activityRoutes');
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3001'], credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'VendorBridge API' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
