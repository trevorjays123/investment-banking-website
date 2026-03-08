const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const billRoutes = require('./routes/bills');
const profileRoutes = require('./routes/profile');
const adminRoutes = require('./routes/admin');
const transfersRoutes = require('./routes/transfers-enhanced');
const tradingRoutes = require('./routes/trading');
const billPayRoutes = require('./routes/bill-pay');
const documentsRoutes = require('./routes/documents');
const investmentAccountsRoutes = require('./routes/investment-accounts');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/bill-pay', billPayRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/investment-accounts', investmentAccountsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: process.env.NODE_ENV || 'production' }));
app.get('/api', (req, res) => res.json({ name: 'Apex Capital Banking API', version: '2.0.0' }));

app.use((err, req, res, next) => { console.error('Server Error:', err.message); res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' }); });

module.exports = app;
