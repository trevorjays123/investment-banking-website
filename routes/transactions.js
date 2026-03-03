const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, transaction, pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate unique reference number
const generateReferenceNumber = () => {
  return 'TXN' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// GET /api/transactions - Get transaction history for all user accounts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, start_date, end_date, type, search } = req.query;
    const offset = (page - 1) * limit;

    // Get user's account IDs
    const accounts = await executeQuery(
      'SELECT id FROM accounts WHERE user_id = ?',
      [req.user.id]
    );

    if (accounts.length === 0) {
      return res.json({ transactions: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }

    const accountIds = accounts.map(a => a.id);

    // Convert array to string for MySQL IN clause
    const accountIdsStr = accountIds.join(',');
    
    let query = `
      SELECT t.*, 
             from_acc.account_number as from_account_number,
             from_acc.account_type as from_account_type,
             to_acc.account_number as to_account_number,
             to_acc.account_type as to_account_type
      FROM transactions t
      LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
      LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
      WHERE (t.from_account_id IN (${accountIdsStr}) OR t.to_account_id IN (${accountIdsStr}))
    `;

    const params = [];

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
      WHERE (t.from_account_id IN (${accountIdsStr}) OR t.to_account_id IN (${accountIdsStr}))
    `;
    const countParams = [];

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

// GET /api/transactions/:id - Get transaction details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's account IDs
    const accounts = await executeQuery(
      'SELECT id FROM accounts WHERE user_id = ?',
      [req.user.id]
    );

    const accountIds = accounts.map(a => a.id);

    const transactions = await executeQuery(
      `SELECT t.*, 
              from_acc.account_number as from_account_number,
              from_acc.account_type as from_account_type,
              to_acc.account_number as to_account_number,
              to_acc.account_type as to_account_type
       FROM transactions t
       LEFT JOIN accounts from_acc ON t.from_account_id = from_acc.id
       LEFT JOIN accounts to_acc ON t.to_account_id = to_acc.id
       WHERE t.id = ? AND (t.from_account_id IN (?) OR t.to_account_id IN (?))`,
      [id, accountIds.join(','), accountIds.join(',')]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction: transactions[0] });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction details' });
  }
});

// POST /api/transactions/transfer - Money transfer (ACID compliant)
router.post('/transfer', authenticateToken, [
  body('from_account_id').isInt(),
  body('to_account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim()
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { from_account_id, to_account_id, amount, description } = req.body;

    // Start transaction
    await connection.beginTransaction();

    // Get sender's account with lock
    const [senderAccount] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE',
      [from_account_id, req.user.id]
    );

    if (senderAccount.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Sender account not found' });
    }

    if (senderAccount[0].status !== 'active') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Sender account is not active' });
    }

    // Check sufficient balance
    if (parseFloat(senderAccount[0].balance) < parseFloat(amount)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get receiver's account with lock
    const [receiverAccount] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ? FOR UPDATE',
      [to_account_id]
    );

    if (receiverAccount.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Receiver account not found' });
    }

    if (receiverAccount[0].status !== 'active') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Receiver account is not active' });
    }

    // Prevent self-transfer
    if (from_account_id === to_account_id) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    // Generate reference number
    const reference_number = generateReferenceNumber();

    // Deduct from sender
    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, from_account_id]
    );

    // Add to receiver
    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, to_account_id]
    );

    // Record transaction
    const [result] = await connection.execute(
      `INSERT INTO transactions 
       (from_account_id, to_account_id, amount, transaction_type, status, description, reference_number, created_at) 
       VALUES (?, ?, ?, 'transfer', 'completed', ?, ?, NOW())`,
      [from_account_id, to_account_id, amount, description || 'Money transfer', reference_number]
    );

    // Commit transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: 'Transfer successful',
      transaction: {
        id: result.insertId,
        reference_number,
        from_account_id,
        to_account_id,
        amount,
        status: 'completed',
        description: description || 'Money transfer'
      }
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  }
});

// POST /api/transactions/deposit - Deposit money
router.post('/deposit', authenticateToken, [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim()
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { account_id, amount, description } = req.body;

    // Start transaction
    await connection.beginTransaction();

    // Get account with lock
    const [account] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE',
      [account_id, req.user.id]
    );

    if (account.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account[0].status !== 'active') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Account is not active' });
    }

    // Generate reference number
    const reference_number = 'DEP' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Add to account
    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, account_id]
    );

    // Record transaction
    const [result] = await connection.execute(
      `INSERT INTO transactions 
       (to_account_id, amount, transaction_type, status, description, reference_number, created_at) 
       VALUES (?, ?, 'deposit', 'completed', ?, ?, NOW())`,
      [account_id, amount, description || 'Deposit', reference_number]
    );

    // Commit transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: 'Deposit successful',
      transaction: {
        id: result.insertId,
        reference_number,
        account_id,
        amount,
        status: 'completed',
        description: description || 'Deposit'
      }
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Deposit failed. Please try again.' });
  }
});

// POST /api/transactions/withdraw - Withdraw money
router.post('/withdraw', authenticateToken, [
  body('account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim()
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { account_id, amount, description } = req.body;

    // Start transaction
    await connection.beginTransaction();

    // Get account with lock
    const [account] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE',
      [account_id, req.user.id]
    );

    if (account.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account[0].status !== 'active') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Account is not active' });
    }

    // Check sufficient balance
    if (parseFloat(account[0].balance) < parseFloat(amount)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Generate reference number
    const reference_number = 'WDR' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Deduct from account
    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, account_id]
    );

    // Record transaction
    const [result] = await connection.execute(
      `INSERT INTO transactions 
       (from_account_id, amount, transaction_type, status, description, reference_number, created_at) 
       VALUES (?, ?, 'withdrawal', 'completed', ?, ?, NOW())`,
      [account_id, amount, description || 'Withdrawal', reference_number]
    );

    // Commit transaction
    await connection.commit();
    connection.release();

    res.status(201).json({
      message: 'Withdrawal successful',
      transaction: {
        id: result.insertId,
        reference_number,
        account_id,
        amount,
        status: 'completed',
        description: description || 'Withdrawal'
      }
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Withdrawal failed. Please try again.' });
  }
});

// POST /api/transactions/reverse - Reverse a transaction
router.post('/reverse', authenticateToken, [
  body('transaction_id').isInt(),
  body('reason').notEmpty()
], async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transaction_id, reason } = req.body;

    // Start transaction
    await connection.beginTransaction();

    // Get transaction details
    const [transactions] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ? FOR UPDATE',
      [transaction_id]
    );

    if (transactions.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const txn = transactions[0];

    // Check if transaction can be reversed
    if (txn.status !== 'completed') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Transaction cannot be reversed' });
    }

    // Verify user owns the source account
    const [accounts] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [txn.from_account_id, req.user.id]
    );

    if (accounts.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ error: 'Unauthorized to reverse this transaction' });
    }

    // Reverse the amounts
    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [txn.amount, txn.from_account_id]
    );

    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [txn.amount, txn.to_account_id]
    );

    // Update original transaction status
    await connection.execute(
      'UPDATE transactions SET status = ? WHERE id = ?',
      ['reversed', transaction_id]
    );

    // Create reversal transaction
    const reversal_reference = 'REV' + txn.reference_number;
    await connection.execute(
      `INSERT INTO transactions 
       (from_account_id, to_account_id, amount, transaction_type, status, description, reference_number, created_at) 
       VALUES (?, ?, ?, 'transfer', 'completed', ?, ?, NOW())`,
      [txn.to_account_id, txn.from_account_id, txn.amount, `Reversal: ${reason}`, reversal_reference]
    );

    // Commit transaction
    await connection.commit();
    connection.release();

    res.json({
      message: 'Transaction reversed successfully',
      reversal_reference
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Reverse error:', error);
    res.status(500).json({ error: 'Failed to reverse transaction' });
  }
});

module.exports = router;
