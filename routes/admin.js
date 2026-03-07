const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const { adminAuth, superAdminOnly } = require('../middleware/adminAuth');
const express = require('express');

const router = express.Router();

// Helper function to send success response
const sendSuccess = (res, data, message = 'Success') => {
  res.json({ success: true, message, data });
};

// Helper function to send error response
const sendError = (res, error, statusCode = 500) => {
  res.status(statusCode).json({ success: false, error: error.message || error });
};

// ============================================
// ADMIN AUTHENTICATION
// ============================================

// POST /api/admin/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Admin login attempt:', email);
    
    // Get user
    const users = await executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check if admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/me - Get current admin info
router.get('/me', adminAuth, async (req, res) => {
  try {
    const users = await executeQuery(
      'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: 'Failed to get admin info' });
  }
});

// ============================================
// DASHBOARD STATISTICS
// ============================================

// GET /api/admin/dashboard - Complete dashboard data
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Total users
    const [userCount] = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    
    // Total investments
    const [investmentCount] = await executeQuery('SELECT COUNT(*) as count FROM investments WHERE status = "active"');
    const [investmentTotal] = await executeQuery('SELECT COALESCE(SUM(amount), 0) as total FROM investments WHERE status = "active"');
    
    // Today's revenue
    const [todayRevenue] = await executeQuery(
      'SELECT COALESCE(SUM(total_revenue), 0) as total FROM daily_revenue WHERE date = CURDATE()'
    );
    
    // Monthly revenue
    const [monthlyRevenue] = await executeQuery(
      'SELECT COALESCE(SUM(total_revenue), 0) as total FROM daily_revenue WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())'
    );
    
    // Total transactions
    const [transactionCount] = await executeQuery('SELECT COUNT(*) as count FROM transactions');
    const [transactionVolume] = await executeQuery('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = "completed"');
    
    // Recent activity (last 10 transactions)
    const recentActivity = await executeQuery(`
      SELECT 
        t.id, t.transaction_type, t.amount, t.status, t.created_at,
        COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Unknown') as user_name
      FROM transactions t
      LEFT JOIN accounts a ON (t.from_account_id = a.id OR t.to_account_id = a.id)
      LEFT JOIN users u ON a.user_id = u.id
      GROUP BY t.id, t.transaction_type, t.amount, t.status, t.created_at, u.first_name, u.last_name
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        users: {
          total: userCount?.count || 0
        },
        investments: {
          total: investmentCount?.count || 0,
          totalAmount: investmentTotal?.total || 0
        },
        revenue: {
          today: todayRevenue?.total || 0,
          monthly: monthlyRevenue?.total || 0
        },
        transactions: {
          total: transactionCount?.count || 0,
          volume: transactionVolume?.total || 0
        },
        recentActivity: recentActivity || []
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard data' });
  }
});

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // Total users
    const [userCount] = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    
    // Total admins
    const [adminCount] = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role IN ("admin", "super_admin")');
    
    // New users today
    const [newUsersToday] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
    );
    
    // Total accounts
    const [accountCount] = await executeQuery('SELECT COUNT(*) as count FROM accounts');
    
    // Total balance
    const [totalBalance] = await executeQuery(
      'SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE status = "active"'
    );
    
    // Transactions today
    const [transactionsToday] = await executeQuery(
      'SELECT COUNT(*) as count FROM transactions WHERE DATE(created_at) = CURDATE()'
    );
    
    // Transaction volume today
    const [transactionVolume] = await executeQuery(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE DATE(created_at) = CURDATE() AND status = "completed"'
    );
    
    // Pending verifications (users with email_verified = false)
    const [pendingVerifications] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE email_verified = FALSE'
    );
    
    // Recent registrations (last 7 days)
    const [recentRegistrations] = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );
    
    res.json({
      users: {
        total: userCount.count,
        admins: adminCount.count,
        newToday: newUsersToday.count,
        recentWeek: recentRegistrations.count
      },
      accounts: {
        total: accountCount.count,
        totalBalance: totalBalance.total
      },
      transactions: {
        today: transactionsToday.count,
        volumeToday: transactionVolume.total
      },
      verifications: {
        pending: pendingVerifications.count
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// GET /api/admin/charts/user-growth - User growth data
router.get('/charts/user-growth', adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const growth = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [days]);
    
    res.json({ growth });
  } catch (error) {
    console.error('User growth error:', error);
    res.status(500).json({ error: 'Failed to get user growth data' });
  }
});

// GET /api/admin/charts/transaction-volume - Transaction volume data
router.get('/charts/transaction-volume', adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const volume = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total
      FROM transactions
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), transaction_type
      ORDER BY date ASC
    `, [days]);
    
    res.json({ volume });
  } catch (error) {
    console.error('Transaction volume error:', error);
    res.status(500).json({ error: 'Failed to get transaction volume data' });
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// GET /api/admin/users - List all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const status = req.query.status || '';
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (role) {
      whereClause += ' AND u.role = ?';
      params.push(role);
    }
    
    // Get total count
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    
    // Get users with account info (use string interpolation for LIMIT/OFFSET)
    const users = await executeQuery(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.phone, u.role,
        u.email_verified, u.two_factor_enabled, u.created_at, u.updated_at,
        COUNT(DISTINCT a.id) as account_count,
        COALESCE(SUM(a.balance), 0) as total_balance
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);
    
    res.json({
      users,
      pagination: {
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /api/admin/users/:id - Get user details
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user
    const [user] = await executeQuery(`
      SELECT 
        u.*,
        COUNT(DISTINCT a.id) as account_count,
        COALESCE(SUM(a.balance), 0) as total_balance
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get user's accounts
    const accounts = await executeQuery(`
      SELECT id, account_number, account_type, balance, currency, status, created_at
      FROM accounts
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    // Get recent transactions
    const transactions = await executeQuery(`
      SELECT t.*, 
             from_acc.account_number as from_account,
             to_acc.account_number as to_account
      FROM transactions t
      LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
      LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
      WHERE from_acc.user_id = ? OR to_acc.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT 20
    `, [userId, userId]);
    
    res.json({
      user,
      accounts,
      transactions
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { first_name, last_name, phone, role, email_verified } = req.body;
    
    await executeQuery(`
      UPDATE users 
      SET first_name = ?, last_name = ?, phone = ?, role = ?, email_verified = ?, updated_at = NOW()
      WHERE id = ?
    `, [first_name, last_name, phone, role, email_verified, userId]);
    
    // Log action
    await executeQuery(`
      INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
      VALUES (?, 'user_update', ?, ?, NOW())
    `, [req.user.id, `Updated user ID ${userId}`, req.ip]);
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/users/:id/verify-email - Manually verify email
router.post('/users/:id/verify-email', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    
    await executeQuery(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?',
      [userId]
    );
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// POST /api/admin/users/:id/reset-password - Force password reset
router.post('/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);
    
    await executeQuery(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [password_hash, userId]
    );
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/admin/users/:id - Delete user (soft delete or hard)
router.delete('/users/:id', adminAuth, superAdminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user exists
    const [user] = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow deleting admin users
    if (user.role === 'admin' || user.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

// GET /api/admin/accounts - List all accounts
router.get('/accounts', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    
    let whereClause = '';
    const params = [];
    
    if (status) {
      whereClause = 'WHERE a.status = ?';
      params.push(status);
    }
    
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM accounts a ${whereClause}`,
      params
    );
    
    const accounts = await executeQuery(`
      SELECT 
        a.*,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        u.email as owner_email
      FROM accounts a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);
    
    res.json({
      accounts,
      pagination: {
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// PUT /api/admin/accounts/:id/freeze - Freeze account
router.put('/accounts/:id/freeze', adminAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    
    await executeQuery(
      'UPDATE accounts SET status = "frozen", updated_at = NOW() WHERE id = ?',
      [accountId]
    );
    
    res.json({ message: 'Account frozen successfully' });
  } catch (error) {
    console.error('Freeze account error:', error);
    res.status(500).json({ error: 'Failed to freeze account' });
  }
});

// PUT /api/admin/accounts/:id/unfreeze - Unfreeze account
router.put('/accounts/:id/unfreeze', adminAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    
    await executeQuery(
      'UPDATE accounts SET status = "active", updated_at = NOW() WHERE id = ?',
      [accountId]
    );
    
    res.json({ message: 'Account unfrozen successfully' });
  } catch (error) {
    console.error('Unfreeze account error:', error);
    res.status(500).json({ error: 'Failed to unfreeze account' });
  }
});

// POST /api/admin/accounts/:id/adjust-balance - Adjust account balance
router.post('/accounts/:id/adjust-balance', adminAuth, async (req, res) => {
  try {
    const accountId = req.params.id;
    const { amount, reason } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    
    // Get current balance
    const [account] = await executeQuery(
      'SELECT balance, account_number FROM accounts WHERE id = ?',
      [accountId]
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const newBalance = parseFloat(account.balance) + parseFloat(amount);
    
    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance for this adjustment' });
    }
    
    await executeQuery(
      'UPDATE accounts SET balance = ?, updated_at = NOW() WHERE id = ?',
      [newBalance, accountId]
    );
    
    // Create transaction record
    await executeQuery(`
      INSERT INTO transactions (from_account_id, to_account_id, amount, transaction_type, status, description, reference_number, created_at)
      VALUES (?, ?, ?, 'deposit', 'completed', ?, CONCAT('ADJ', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s')), NOW())
    `, [null, accountId, Math.abs(amount), `Admin adjustment: ${reason}`]);
    
    res.json({ 
      message: 'Balance adjusted successfully',
      previousBalance: account.balance,
      adjustment: amount,
      newBalance
    });
  } catch (error) {
    console.error('Adjust balance error:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

// GET /api/admin/transactions - List all transactions
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { type, status, startDate, endDate, minAmount, maxAmount, search } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (type) {
      whereClause += ' AND t.transaction_type = ?';
      params.push(type);
    }
    
    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    
    if (startDate) {
      whereClause += ' AND DATE(t.created_at) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND DATE(t.created_at) <= ?';
      params.push(endDate);
    }
    
    if (minAmount) {
      whereClause += ' AND t.amount >= ?';
      params.push(parseFloat(minAmount));
    }
    
    if (maxAmount) {
      whereClause += ' AND t.amount <= ?';
      params.push(parseFloat(maxAmount));
    }
    
    if (search) {
      whereClause += ' AND (t.reference_number LIKE ? OR from_user.email LIKE ? OR to_user.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM transactions t 
       LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
       LEFT JOIN users from_user ON from_acc.user_id = from_user.id
       LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
       LEFT JOIN users to_user ON to_acc.user_id = to_user.id
       ${whereClause}`,
      params
    );
    
    const transactions = await executeQuery(`
      SELECT 
        t.*,
        from_acc.account_number as from_account_number,
        to_acc.account_number as to_account_number,
        CONCAT(from_user.first_name, ' ', from_user.last_name) as from_user_name,
        from_user.email as from_user_email,
        CONCAT(to_user.first_name, ' ', to_user.last_name) as to_user_name,
        to_user.email as to_user_email
      FROM transactions t
      LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
      LEFT JOIN users from_user ON from_acc.user_id = from_user.id
      LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
      LEFT JOIN users to_user ON to_acc.user_id = to_user.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);
    
    res.json({
      transactions,
      pagination: {
        total: countResult.total,
        page,
        limit,
        totalPages: Math.ceil(countResult.total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// ============================================
// SETTINGS
// ============================================

// GET /api/admin/settings - Get all settings
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await executeQuery('SELECT * FROM admin_settings ORDER BY setting_key');
    
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });
    
    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// PUT /api/admin/settings - Update settings
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const { settings } = req.body;
    
    for (const [key, value] of Object.entries(settings)) {
      await executeQuery(`
        INSERT INTO admin_settings (setting_key, setting_value, updated_by, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?, updated_at = NOW()
      `, [key, value, req.user.id, value, req.user.id]);
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// SYSTEM ALERTS
// ============================================

// GET /api/admin/alerts - Get all alerts
router.get('/alerts', adminAuth, async (req, res) => {
  try {
    const alerts = await executeQuery(`
      SELECT sa.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
      FROM system_alerts sa
      LEFT JOIN users u ON sa.created_by = u.id
      ORDER BY sa.created_at DESC
    `);
    
    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// POST /api/admin/alerts - Create alert
router.post('/alerts', adminAuth, async (req, res) => {
  try {
    const { type, title, message, expires_at } = req.body;
    
    const result = await executeQuery(`
      INSERT INTO system_alerts (type, title, message, created_by, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [type, title, message, req.user.id, expires_at || null]);
    
    res.json({ message: 'Alert created successfully', id: result.insertId });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// PUT /api/admin/alerts/:id - Update alert
router.put('/alerts/:id', adminAuth, async (req, res) => {
  try {
    const alertId = req.params.id;
    const { is_active } = req.body;
    
    await executeQuery(
      'UPDATE system_alerts SET is_active = ? WHERE id = ?',
      [is_active, alertId]
    );
    
    res.json({ message: 'Alert updated successfully' });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// DELETE /api/admin/alerts/:id - Delete alert
router.delete('/alerts/:id', adminAuth, async (req, res) => {
  try {
    await executeQuery('DELETE FROM system_alerts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// ============================================
// INVESTMENTS MANAGEMENT
// ============================================

// GET /api/admin/investments - List all investments
router.get('/investments', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause = 'WHERE i.status = ?';
      params.push(status);
    }

    // Get total count
    const [countResult] = await executeQuery(
      `SELECT COUNT(*) as total FROM investments i ${whereClause}`,
      params
    );

    // Get investments with user info
    const investments = await executeQuery(`
      SELECT 
        i.*,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM investments i
      LEFT JOIN users u ON i.user_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, params);

    res.json({
      success: true,
      data: {
        investments: investments || [],
        pagination: {
          total: countResult?.total || 0,
          page,
          limit,
          totalPages: Math.ceil((countResult?.total || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get investments' });
  }
});

// ============================================
// REVENUE MANAGEMENT
// ============================================

// GET /api/admin/revenue - Get revenue data
router.get('/revenue', adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const revenue = await executeQuery(`
      SELECT 
        date,
        transaction_fees as transactionFees,
        investment_fees as investmentFees,
        service_charges as serviceCharges,
        interest_income as interestIncome,
        total_revenue as total
      FROM daily_revenue
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY date ASC
    `, [days]);

    res.json({
      success: true,
      data: revenue || []
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ success: false, error: 'Failed to get revenue data' });
  }
});

// ============================================
// AUDIT LOGS
// ============================================

// GET /api/admin/audit - Get audit logs
router.get('/audit', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await executeQuery('SELECT COUNT(*) as total FROM audit_logs');

    const logs = await executeQuery(`
      SELECT al.*, 
             CONCAT(u.first_name, ' ', u.last_name) as admin_name,
             u.email as admin_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, []);

    res.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          total: countResult?.total || 0,
          page,
          limit,
          totalPages: Math.ceil((countResult?.total || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

// GET /api/admin/audit-logs - Alias for audit logs (frontend compatibility)
router.get('/audit-logs', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await executeQuery('SELECT COUNT(*) as total FROM audit_logs');

    const logs = await executeQuery(`
      SELECT al.*, 
             CONCAT(u.first_name, ' ', u.last_name) as admin_name,
             u.email as admin_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, []);

    res.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          total: countResult?.total || 0,
          page,
          limit,
          totalPages: Math.ceil((countResult?.total || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

// ============================================
// CREATE USER (Admin creates user)
// ============================================

// POST /api/admin/users - Create new user
router.post('/users', adminAuth, async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, role } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if email already exists
    const existingUsers = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await executeQuery(`
      INSERT INTO users (first_name, last_name, email, password_hash, phone, role, email_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
    `, [first_name, last_name, email, password_hash, phone || null, role || 'user']);

    // Log action
    await executeQuery(`
      INSERT INTO audit_logs (user_id, action, target_type, target_id, details, ip_address, created_at)
      VALUES (?, 'user_create', 'user', ?, ?, ?, NOW())
    `, [req.user.id, result.insertId, `Created user: ${email}`, req.ip]);

    res.json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

module.exports = router;
