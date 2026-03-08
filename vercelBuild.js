const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

// CRITICAL: Import database config for Vercel
const { testConnection } = require('./config/database');

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
const migrateRoutes = require('./routes/migrate');

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
app.use('/api/migrate', migrateRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    environment: process.env.NODE_ENV || 'production',
    dbConnected: true // Database is initialized at startup
  });
});
app.get('/api', (req, res) => res.json({ name: 'Apex Capital Banking API', version: '2.0.0' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  console.error('Stack:', err.stack); // Add stack for debugging
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Initialize database connection on Vercel startup
const initVercel = async () => {
  try {
    console.log('🔄 Initializing database connection for Vercel...');
    const dbConnected = await testConnection();
    if (dbConnected) {
      console.log('✅ Database connected successfully on Vercel');
    } else {
      console.error('❌ Database connection failed on Vercel');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

// Run initialization
initVercel();

module.exports = app;
