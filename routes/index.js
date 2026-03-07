const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const accountsRoutes = require('./accounts');
const transactionsRoutes = require('./transactions');
const billsRoutes = require('./bills');
const profileRoutes = require('./profile');
const adminRoutes = require('./admin');

// Mount routes
router.use('/auth', authRoutes);
router.use('/accounts', accountsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/bills', billsRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API version info
router.get('/', (req, res) => {
    res.json({
        name: 'Online Banking API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            accounts: '/api/accounts',
            transactions: '/api/transactions',
            bills: '/api/bills',
            profile: '/api/profile',
            admin: '/api/admin'
        }
    });
});

module.exports = router;
  