const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/bills/payees - Get all payees
router.get('/payees', authenticateToken, async (req, res) => {
  try {
    const payees = await executeQuery(
      'SELECT * FROM payees WHERE user_id = ? ORDER BY payee_name ASC',
      [req.user.id]
    );

    res.json({ payees });
  } catch (error) {
    console.error('Get payees error:', error);
    res.status(500).json({ error: 'Failed to fetch payees' });
  }
});

// POST /api/bills/payees - Add new payee
router.post('/payees', authenticateToken, [
  body('payee_name').notEmpty().trim(),
  body('account_number').notEmpty().trim(),
  body('bank_name').notEmpty().trim(),
  body('routing_number').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payee_name, account_number, bank_name, routing_number } = req.body;

    // Check if payee already exists for this user
    const existingPayee = await executeQuery(
      'SELECT * FROM payees WHERE user_id = ? AND account_number = ?',
      [req.user.id, account_number]
    );

    if (existingPayee.length > 0) {
      return res.status(400).json({ error: 'Payee with this account number already exists' });
    }

    const result = await executeQuery(
      `INSERT INTO payees (user_id, payee_name, account_number, bank_name, routing_number) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, payee_name, account_number, bank_name, routing_number]
    );

    res.status(201).json({
      message: 'Payee added successfully',
      payee_id: result.insertId
    });
  } catch (error) {
    console.error('Add payee error:', error);
    res.status(500).json({ error: 'Failed to add payee' });
  }
});

// PUT /api/bills/payees/:id - Update payee
router.put('/payees/:id', authenticateToken, [
  body('payee_name').optional().trim(),
  body('account_number').optional().trim(),
  body('bank_name').optional().trim(),
  body('routing_number').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { payee_name, account_number, bank_name, routing_number } = req.body;

    // Verify payee belongs to user
    const payees = await executeQuery(
      'SELECT * FROM payees WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (payees.length === 0) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (payee_name) {
      updates.push('payee_name = ?');
      params.push(payee_name);
    }
    if (account_number) {
      updates.push('account_number = ?');
      params.push(account_number);
    }
    if (bank_name) {
      updates.push('bank_name = ?');
      params.push(bank_name);
    }
    if (routing_number) {
      updates.push('routing_number = ?');
      params.push(routing_number);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await executeQuery(
      `UPDATE payees SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Payee updated successfully' });
  } catch (error) {
    console.error('Update payee error:', error);
    res.status(500).json({ error: 'Failed to update payee' });
  }
});

// DELETE /api/bills/payees/:id - Delete payee
router.delete('/payees/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeQuery(
      'DELETE FROM payees WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    res.json({ message: 'Payee deleted successfully' });
  } catch (error) {
    console.error('Delete payee error:', error);
    res.status(500).json({ error: 'Failed to delete payee' });
  }
});

// GET /api/bills/payments - Get bill payments
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT bp.*, p.payee_name, p.bank_name, p.account_number
      FROM bill_payments bp
      JOIN payees p ON bp.payee_id = p.id
      WHERE bp.user_id = ?
    `;

    const params = [req.user.id];

    if (status) {
      query += ' AND bp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY bp.payment_date DESC, bp.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const payments = await executeQuery(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM bill_payments WHERE user_id = ?';
    const countParams = [req.user.id];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/bills/payments - Schedule a bill payment
router.post('/payments', authenticateToken, [
  body('payee_id').isInt(),
  body('from_account_id').isInt(),
  body('amount').isFloat({ min: 0.01 }),
  body('payment_date').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payee_id, from_account_id, amount, payment_date } = req.body;

    // Verify payee belongs to user
    const payees = await executeQuery(
      'SELECT * FROM payees WHERE id = ? AND user_id = ?',
      [payee_id, req.user.id]
    );

    if (payees.length === 0) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    // Verify account belongs to user
    const accounts = await executeQuery(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [from_account_id, req.user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check if payment date is in the past
    const paymentDate = new Date(payment_date);
    if (paymentDate < new Date()) {
      return res.status(400).json({ error: 'Payment date cannot be in the past' });
    }

    const result = await executeQuery(
      `INSERT INTO bill_payments (user_id, payee_id, from_account_id, amount, payment_date, status) 
       VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      [req.user.id, payee_id, from_account_id, amount, payment_date]
    );

    res.status(201).json({
      message: 'Bill payment scheduled successfully',
      payment_id: result.insertId
    });
  } catch (error) {
    console.error('Schedule payment error:', error);
    res.status(500).json({ error: 'Failed to schedule payment' });
  }
});

// POST /api/bills/payments/:id/pay - Pay a scheduled bill now
router.post('/payments/:id/pay', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    // Start transaction
    await connection.beginTransaction();

    // Get payment details
    const [payments] = await connection.execute(
      'SELECT * FROM bill_payments WHERE id = ? AND user_id = ? FOR UPDATE',
      [id, req.user.id]
    );

    if (payments.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    if (payment.status !== 'scheduled') {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Payment cannot be processed' });
    }

    // Get account details
    const [accounts] = await connection.execute(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? FOR UPDATE',
      [payment.from_account_id, req.user.id]
    );

    if (accounts.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = accounts[0];

    // Check sufficient balance
    if (parseFloat(account.balance) < parseFloat(payment.amount)) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Get payee details
    const [payees] = await connection.execute(
      'SELECT * FROM payees WHERE id = ?',
      [payment.payee_id]
    );

    // Deduct from account
    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [payment.amount, payment.from_account_id]
    );

    // Generate reference number
    const reference_number = 'BILL' + Date.now() + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create transaction record
    await connection.execute(
      `INSERT INTO transactions 
       (from_account_id, to_account_id, amount, transaction_type, status, description, reference_number, created_at) 
       VALUES (?, NULL, ?, 'payment', 'completed', ?, ?, NOW())`,
      [payment.from_account_id, payment.amount, `Bill Payment to ${payees[0].payee_name}`, reference_number]
    );

    // Update payment status
    await connection.execute(
      'UPDATE bill_payments SET status = ? WHERE id = ?',
      ['paid', id]
    );

    // Commit transaction
    await connection.commit();
    connection.release();

    res.json({
      message: 'Bill payment processed successfully',
      reference_number
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Pay bill error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

// DELETE /api/bills/payments/:id - Cancel a scheduled payment
router.delete('/payments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify payment belongs to user and is scheduled
    const payments = await executeQuery(
      'SELECT * FROM bill_payments WHERE id = ? AND user_id = ? AND status = ?',
      [id, req.user.id, 'scheduled']
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Scheduled payment not found' });
    }

    await executeQuery(
      'UPDATE bill_payments SET status = ? WHERE id = ?',
      ['failed', id]
    );

    res.json({ message: 'Payment cancelled successfully' });
  } catch (error) {
    console.error('Cancel payment error:', error);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

module.exports = router;
