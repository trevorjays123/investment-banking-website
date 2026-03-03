const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { adminOnly, authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard - Get admin dashboard statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get total users count
    const userCount = await executeQuery('SELECT COUNT(*) as count FROM users');
    
    // Get total accounts and balance
    const accountStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_accounts,
        SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) as total_balance
      FROM accounts
    `);
    
    // Get total investments
    const investmentStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_investments,
        SUM(amount) as total_invested
      FROM investments
      WHERE status = 'active'
    `);
    
    // Get today's revenue
    const todayRevenue = await executeQuery(`
      SELECT 
        COALESCE(SUM(total_revenue), 0) as today_revenue
      FROM platform_revenue
      WHERE revenue_date = CURDATE()
    `);
    
    // Get monthly revenue
    const monthlyRevenue = await executeQuery(`
      SELECT 
        COALESCE(SUM(total_revenue), 0) as monthly_revenue
      FROM platform_revenue
      WHERE MONTH(revenue_date) = MONTH(CURDATE())
      AND YEAR(revenue_date) = YEAR(CURDATE())
    `);
    
    // Get total transactions count
    const transactionStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_transaction_volume
      FROM transactions
      WHERE status = 'completed'
    `);
    
    // Get recent activity (last 10 transactions)
    const recentActivity = await executeQuery(`
      SELECT 
        t.id,
        t.transaction_type,
        t.amount,
        t.status,
        t.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM transactions t
      JOIN accounts a ON (t.from_account_id = a.id OR t.to_account_id = a.id)
      JOIN users u ON a.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: {
        users: {
          total: userCount[0].count
        },
        accounts: {
          total: accountStats[0].total_accounts,
          totalBalance: parseFloat(accountStats[0].total_balance || 0)
        },
        investments: {
          total: investmentStats[0].total_investments,
          totalAmount: parseFloat(investmentStats[0].total_invested || 0)
        },
        revenue: {
          today: parseFloat(todayRevenue[0].today_revenue || 0),
          monthly: parseFloat(monthlyRevenue[0].monthly_revenue || 0)
        },
        transactions: {
          total: transactionStats[0].total_transactions,
          volume: parseFloat(transactionStats[0].total_transaction_volume || 0)
        },
        recentActivity: recentActivity
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/admin/users - Get all users with pagination
 */
router.get('/users', [
  body('page').optional().isInt({ min: 1 }),
  body('limit').optional().isInt({ min: 1, max: 100 }),
  body('search').optional().trim()
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Get users
    const users = await executeQuery(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.role,
        u.email_verified,
        u.two_factor_enabled,
        u.created_at,
        u.updated_at,
        COUNT(DISTINCT a.id) as account_count,
        COALESCE(SUM(a.balance), 0) as total_balance
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      WHERE ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    // Get total count for pagination
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM users WHERE ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        users: users.map(u => ({
          ...u,
          total_balance: parseFloat(u.total_balance || 0)
        })),
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/users/:id - Get single user details
 */
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const users = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    delete user.password_hash;
    
    // Get user's accounts
    const accounts = await executeQuery(`
      SELECT 
        id, account_number, account_type, balance, currency, status, created_at
      FROM accounts 
      WHERE user_id = ?
    `, [userId]);
    
    // Get user's investments
    const investments = await executeQuery(`
      SELECT 
        id, investment_type, amount, expected_return, status, start_date, maturity_date
      FROM investments 
      WHERE user_id = ?
    `, [userId]);
    
    // Get user's recent transactions
    const transactions = await executeQuery(`
      SELECT 
        t.id, t.transaction_type, t.amount, t.status, t.description, t.created_at,
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
      success: true,
      data: {
        user: {
          ...user,
          accounts: accounts.map(a => ({ ...a, balance: parseFloat(a.balance || 0) })),
          investments: investments.map(i => ({ ...i, amount: parseFloat(i.amount || 0) })),
          transactions: transactions.map(t => ({ ...t, amount: parseFloat(t.amount || 0) }))
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/admin/users/:id - Update user
 */
router.put('/users/:id', [
  body('first_name').optional().trim().notEmpty(),
  body('last_name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('role').optional().isIn(['user', 'admin']),
  body('email_verified').optional().isBoolean(),
  body('status').optional().isIn(['active', 'frozen', 'closed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.params.id;
    const { first_name, last_name, phone, role, email_verified, status } = req.body;
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (first_name) { updates.push('first_name = ?'); values.push(first_name); }
    if (last_name) { updates.push('last_name = ?'); values.push(last_name); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (role) { updates.push('role = ?'); values.push(role); }
    if (email_verified !== undefined) { updates.push('email_verified = ?'); values.push(email_verified); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = NOW()');
    values.push(userId);
    
    await executeQuery(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `, values);
    
    // Log admin action
    await logAdminAction(req.user.id, 'UPDATE_USER', 'user', userId, { updates: req.body });
    
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id - Delete user
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Check if user exists
    const users = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user (cascade will handle related records)
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
    
    // Log admin action
    await logAdminAction(req.user.id, 'DELETE_USER', 'user', userId, { deleted_email: users[0].email });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * POST /api/admin/users - Create new user (admin creation)
 */
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('role').optional().isIn(['user', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, first_name, last_name, phone, role = 'user' } = req.body;
    
    // Check if email exists
    const existing = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await executeQuery(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role, email_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
    `, [email, password_hash, first_name, last_name, phone || null, role]);
    
    // Log admin action
    await logAdminAction(req.user.id, 'CREATE_USER', 'user', result.insertId, { email, role });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user_id: result.insertId
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * GET /api/admin/revenue - Get revenue data for charts
 */
router.get('/revenue', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const revenueData = await executeQuery(`
      SELECT 
        revenue_date,
        transaction_fees,
        investment_fees,
        service_charges,
        interest_income,
        total_revenue
      FROM platform_revenue
      WHERE revenue_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY revenue_date ASC
    `, [days]);
    
    res.json({
      success: true,
      data: revenueData.map(r => ({
        date: r.revenue_date,
        transactionFees: parseFloat(r.transaction_fees || 0),
        investmentFees: parseFloat(r.investment_fees || 0),
        serviceCharges: parseFloat(r.service_charges || 0),
        interestIncome: parseFloat(r.interest_income || 0),
        total: parseFloat(r.total_revenue || 0)
      }))
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

/**
 * GET /api/admin/investments - Get all investments
 */
router.get('/investments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const investments = await executeQuery(`
      SELECT 
        i.id,
        i.investment_type,
        i.amount,
        i.expected_return,
        i.status,
        i.start_date,
        i.maturity_date,
        u.id as user_id,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        a.account_number
      FROM investments i
      JOIN users u ON i.user_id = u.id
      JOIN accounts a ON i.account_id = a.id
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM investments');
    
    res.json({
      success: true,
      data: {
        investments: investments.map(i => ({
          ...i,
          amount: parseFloat(i.amount || 0),
          expected_return: parseFloat(i.expected_return || 0)
        })),
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get investments error:', error);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

/**
 * GET /api/admin/transactions - Get all transactions
 */
router.get('/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || '';
    const offset = (page - 1) * limit;
    
    let whereClause = '1=1';
    let params = [];
    
    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    
    const transactions = await executeQuery(`
      SELECT 
        t.id,
        t.transaction_type,
        t.amount,
        t.status,
        t.description,
        t.reference_number,
        t.created_at,
        from_u.email as from_user_email,
        to_u.email as to_user_email,
        from_acc.account_number as from_account,
        to_acc.account_number as to_account
      FROM transactions t
      LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
      LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
      LEFT JOIN users from_u ON from_acc.user_id = from_u.id
      LEFT JOIN users to_u ON to_acc.user_id = to_u.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM transactions t WHERE ${whereClause}
    `, params);
    
    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          ...t,
          amount: parseFloat(t.amount || 0)
        })),
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/admin/audit-logs - Get admin audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const logs = await executeQuery(`
      SELECT 
        al.id,
        al.action,
        al.target_type,
        al.target_id,
        al.details,
        al.ip_address,
        al.created_at,
        u.email as admin_email,
        CONCAT(u.first_name, ' ', u.last_name) as admin_name
      FROM admin_audit_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM admin_audit_logs');
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

/**
 * Helper function to log admin actions
 */
async function logAdminAction(adminId, action, targetType, targetId, details) {
  try {
    await executeQuery(`
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [adminId, action, targetType, targetId, JSON.stringify(details)]);
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

module.exports = router;