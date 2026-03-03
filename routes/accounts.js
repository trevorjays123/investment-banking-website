const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/accounts - Get all accounts for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const accounts = await executeQuery(
      `SELECT a.*, 
              u.first_name, u.last_name, u.email 
       FROM accounts a 
       JOIN users u ON a.user_id = u.id 
       WHERE u.id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json({ accounts });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// GET /api/accounts/:id - Get account details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const accounts = await executeQuery(
      `SELECT a.*, 
              u.first_name, u.last_name, u.email 
       FROM accounts a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.id = ? AND a.user_id = ?`,
      [id, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ account: accounts[0] });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account details' });
  }
});

// GET /api/accounts/:id/transactions - Get account transactions
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, start_date, end_date, type, search } = req.query;
    const offset = (page - 1) * limit;

    // Verify account belongs to user
    const accounts = await executeQuery(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    let query = `
      SELECT t.*, 
             from_acc.account_number as from_account_number,
             from_acc.account_type as from_account_type,
             to_acc.account_number as to_account_number,
             to_acc.account_type as to_account_type
      FROM transactions t
      LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
      LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
      WHERE (t.from_account_id = ? OR t.to_account_id = ?)
    `;

    const params = [id, id];

    // Add date filter
    if (start_date && end_date) {
      query += ' AND DATE(t.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Add type filter
    if (type) {
      query += ' AND t.transaction_type = ?';
      params.push(type);
    }

    // Add search filter
    if (search) {
      query += ' AND t.description LIKE ?';
      params.push(`%${search}%`);
    }

    // Add pagination
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await executeQuery(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE (t.from_account_id = ? OR t.to_account_id = ?)
    `;
    const countParams = [id, id];

    if (start_date && end_date) {
      countQuery += ' AND DATE(t.created_at) BETWEEN ? AND ?';
      countParams.push(start_date, end_date);
    }
    if (type) {
      countQuery += ' AND t.transaction_type = ?';
      countParams.push(type);
    }
    if (search) {
      countQuery += ' AND t.description LIKE ?';
      countParams.push(`%${search}%`);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/accounts/:id/statement - Get account statement
router.get('/:id/statement', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Verify account belongs to user
    const accounts = await executeQuery(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accounts[0];

    let query = `
      SELECT t.*, 
             from_acc.account_number as from_account_number,
             to_acc.account_number as to_account_number
      FROM transactions t
      LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
      LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
      WHERE (t.from_account_id = ? OR t.to_account_id = ?)
        AND t.status = 'completed'
    `;

    const params = [id, id];

    if (start_date && end_date) {
      query += ' AND DATE(t.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY t.created_at ASC';

    const transactions = await executeQuery(query, params);

    // Calculate running balance
    let runningBalance = 0;
    const statement = transactions.map(t => {
      if (t.from_account_id === parseInt(id)) {
        runningBalance -= parseFloat(t.amount);
      } else {
        runningBalance += parseFloat(t.amount);
      }
      return {
        ...t,
        running_balance: runningBalance
      };
    });

    res.json({
      account,
      statement,
      period: { start_date, end_date }
    });
  } catch (error) {
    console.error('Get statement error:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

// POST /api/accounts - Create new account
router.post('/', authenticateToken, [
  body('account_type').isIn(['checking', 'savings', 'credit']),
  body('initial_deposit').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { account_type, currency = 'USD', initial_deposit = 0 } = req.body;

    // Generate account number
    const accountNumber = account_type.substring(0, 3).toUpperCase() + 
                          Date.now() + 
                          Math.floor(Math.random() * 1000);

    const result = await executeQuery(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
      [req.user.id, accountNumber, account_type, initial_deposit, currency]
    );

    res.status(201).json({
      message: 'Account created successfully',
      account_id: result.insertId,
      account_number: accountNumber
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /api/accounts/:id/freeze - Freeze account
router.put('/:id/freeze', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      'UPDATE accounts SET status = ? WHERE id = ? AND user_id = ?',
      ['frozen', id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ message: 'Account frozen successfully' });
  } catch (error) {
    console.error('Freeze account error:', error);
    res.status(500).json({ error: 'Failed to freeze account' });
  }
});

// PUT /api/accounts/:id/close - Close account
router.put('/:id/close', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account has balance
    const accounts = await executeQuery(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (parseFloat(accounts[0].balance) > 0) {
      return res.status(400).json({ error: 'Cannot close account with balance' });
    }

    const result = await executeQuery(
      'UPDATE accounts SET status = ? WHERE id = ? AND user_id = ?',
      ['closed', id, req.user.id]
    );

    res.json({ message: 'Account closed successfully' });
  } catch (error) {
    console.error('Close account error:', error);
    res.status(500).json({ error: 'Failed to close account' });
  }
});

module.exports = router;
