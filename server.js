const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
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

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Apex Capital Banking API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      bills: '/api/bills',
      profile: '/api/profile',
      admin: '/api/admin',
      transfers: '/api/transfers',
      trading: '/api/trading',
      billPay: '/api/bill-pay',
      documents: '/api/documents',
      investmentAccounts: '/api/investment-accounts'
    }
  });
});

// Serve admin dashboard for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve frontend for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('⚠️  Warning: Database connection failed. Please check your configuration.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
