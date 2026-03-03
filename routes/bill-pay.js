/**
 * Investment Banking Platform - Bill Pay Routes
 * Handles billers, scheduled payments, and payment history
 */

const express = require('express');
const router = express.Router();
const { executeQuery, beginTransaction, commit, rollback } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate payment ID
function generatePaymentId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PMT${timestamp}${random}`;
}

// ============================================
// BILLERS
// ============================================

/**
 * GET /api/bill-pay/billers
 * Get all billers for user
 */
router.get('/billers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const billers = await executeQuery(`
            SELECT 
                b.*,
                ub.id as user_biller_id,
                ub.account_number_encrypted,
                ub.account_number_masked,
                ub.nickname,
                ub.is_active,
                ub.last_payment_date,
                ub.last_payment_amount
            FROM user_billers ub
            JOIN billers b ON ub.biller_id = b.id
            WHERE ub.user_id = ? AND ub.is_active = TRUE
            ORDER BY ub.nickname OR b.biller_name
        `, [userId]);
        
        res.json({ success: true, data: billers });
    } catch (error) {
        console.error('Get billers error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve billers' });
    }
});

/**
 * GET /api/bill-pay/billers/search
 * Search for billers
 */
router.get('/billers/search', authenticateToken, async (req, res) => {
    try {
        const { q, category } = req.query;
        
        let query = 'SELECT * FROM billers WHERE is_active = TRUE';
        const params = [];
        
        if (q) {
            query += ' AND (biller_name LIKE ? OR keywords LIKE ?)';
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        query += ' LIMIT 20';
        
        const billers = await executeQuery(query, params);
        res.json({ success: true, data: billers });
    } catch (error) {
        console.error('Search billers error:', error);
        res.status(500).json({ success: false, message: 'Failed to search billers' });
    }
});

/**
 * GET /api/bill-pay/categories
 * Get biller categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
    try {
        const categories = await executeQuery(`
            SELECT DISTINCT category, COUNT(*) as biller_count
            FROM billers
            WHERE is_active = TRUE
            GROUP BY category
            ORDER BY category
        `);
        
        res.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve categories' });
    }
});

/**
 * POST /api/bill-pay/billers
 * Add a new biller to user's list
 */
router.post('/billers', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { biller_id, account_number, nickname } = req.body;
        
        if (!biller_id || !account_number) {
            return res.status(400).json({ success: false, message: 'Biller and account number required' });
        }
        
        // Verify biller exists
        const biller = await executeQuery(
            'SELECT * FROM billers WHERE id = ? AND is_active = TRUE',
            [biller_id]
        );
        
        if (biller.length === 0) {
            return res.status(404).json({ success: false, message: 'Biller not found' });
        }
        
        // Check if already added
        const existing = await executeQuery(
            'SELECT * FROM user_billers WHERE user_id = ? AND biller_id = ?',
            [userId, biller_id]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Biller already added' });
        }
        
        // Mask account number
        const masked = account_number.slice(-4).padStart(account_number.length, '*');
        
        const result = await executeQuery(`
            INSERT INTO user_billers (user_id, biller_id, account_number_encrypted, 
                account_number_masked, nickname, is_active, added_at)
            VALUES (?, ?, ?, ?, ?, TRUE, NOW())
        `, [userId, biller_id, account_number, masked, nickname || biller[0].biller_name]);
        
        res.status(201).json({
            success: true,
            message: 'Biller added successfully',
            data: {
                id: result.insertId,
                biller_id,
                biller_name: biller[0].biller_name,
                account_number_masked: masked,
                nickname: nickname || biller[0].biller_name
            }
        });
    } catch (error) {
        console.error('Add biller error:', error);
        res.status(500).json({ success: false, message: 'Failed to add biller' });
    }
});

/**
 * PUT /api/bill-pay/billers/:id
 * Update user biller
 */
router.put('/billers/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { nickname, account_number } = req.body;
        
        const userBiller = await executeQuery(
            'SELECT * FROM user_billers WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        if (userBiller.length === 0) {
            return res.status(404).json({ success: false, message: 'Biller not found' });
        }
        
        let updateQuery = 'UPDATE user_billers SET ';
        const updates = [];
        const params = [];
        
        if (nickname) {
            updates.push('nickname = ?');
            params.push(nickname);
        }
        
        if (account_number) {
            const masked = account_number.slice(-4).padStart(account_number.length, '*');
            updates.push('account_number_encrypted = ?, account_number_masked = ?');
            params.push(account_number, masked);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }
        
        updateQuery += updates.join(', ') + ' WHERE id = ? AND user_id = ?';
        params.push(req.params.id, userId);
        
        await executeQuery(updateQuery, params);
        
        res.json({ success: true, message: 'Biller updated successfully' });
    } catch (error) {
        console.error('Update biller error:', error);
        res.status(500).json({ success: false, message: 'Failed to update biller' });
    }
});

/**
 * DELETE /api/bill-pay/billers/:id
 * Remove biller from user's list
 */
router.delete('/billers/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        await executeQuery(
            'UPDATE user_billers SET is_active = FALSE WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        res.json({ success: true, message: 'Biller removed successfully' });
    } catch (error) {
        console.error('Remove biller error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove biller' });
    }
});

// ============================================
// SCHEDULED PAYMENTS
// ============================================

/**
 * GET /api/bill-pay/scheduled
 * Get scheduled payments
 */
router.get('/scheduled', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, upcoming } = req.query;
        
        let query = `
            SELECT 
                sp.*,
                b.biller_name,
                b.category,
                a.account_name as pay_from_name,
                a.account_number as pay_from_number
            FROM scheduled_payments sp
            JOIN user_billers ub ON sp.user_biller_id = ub.id
            JOIN billers b ON ub.biller_id = b.id
            LEFT JOIN accounts a ON sp.pay_from_account_id = a.id
            WHERE ub.user_id = ?
        `;
        const params = [userId];
        
        if (status) {
            query += ' AND sp.status = ?';
            params.push(status);
        }
        
        if (upcoming === 'true') {
            query += ' AND sp.next_payment_date >= CURDATE() AND sp.status = "active"';
        }
        
        query += ' ORDER BY sp.next_payment_date ASC';
        
        const payments = await executeQuery(query, params);
        
        res.json({ success: true, data: payments });
    } catch (error) {
        console.error('Get scheduled payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve scheduled payments' });
    }
});

/**
 * POST /api/bill-pay/scheduled
 * Create a scheduled payment
 */
router.post('/scheduled', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            user_biller_id,
            pay_from_account_id,
            amount,
            frequency,
            start_date,
            end_date,
            payment_type = 'standard',
            memo
        } = req.body;
        
        if (!user_biller_id || !pay_from_account_id || !amount || !frequency || !start_date) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Verify user owns the biller
        const userBiller = await executeQuery(
            'SELECT ub.*, b.biller_name FROM user_billers ub JOIN billers b ON ub.biller_id = b.id WHERE ub.id = ? AND ub.user_id = ?',
            [user_biller_id, userId]
        );
        
        if (userBiller.length === 0) {
            return res.status(404).json({ success: false, message: 'Biller not found' });
        }
        
        // Verify user owns the account
        const account = await executeQuery(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND status = "active"',
            [pay_from_account_id, userId]
        );
        
        if (account.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        const result = await executeQuery(`
            INSERT INTO scheduled_payments (
                user_biller_id, pay_from_account_id, amount, frequency,
                start_date, next_payment_date, end_date, payment_type, memo, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())
        `, [user_biller_id, pay_from_account_id, amount, frequency,
            start_date, start_date, end_date || null, payment_type, memo || null]);
        
        res.status(201).json({
            success: true,
            message: 'Scheduled payment created successfully',
            data: {
                id: result.insertId,
                biller_name: userBiller[0].biller_name,
                amount,
                frequency,
                next_payment_date: start_date
            }
        });
    } catch (error) {
        console.error('Create scheduled payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to create scheduled payment' });
    }
});

/**
 * PUT /api/bill-pay/scheduled/:id
 * Update scheduled payment
 */
router.put('/scheduled/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, frequency, next_payment_date, end_date, status, memo } = req.body;
        
        // Verify ownership
        const payment = await executeQuery(`
            SELECT sp.* FROM scheduled_payments sp
            JOIN user_billers ub ON sp.user_biller_id = ub.id
            WHERE sp.id = ? AND ub.user_id = ?
        `, [req.params.id, userId]);
        
        if (payment.length === 0) {
            return res.status(404).json({ success: false, message: 'Scheduled payment not found' });
        }
        
        const updates = [];
        const params = [];
        
        if (amount) {
            updates.push('amount = ?');
            params.push(amount);
        }
        if (frequency) {
            updates.push('frequency = ?');
            params.push(frequency);
        }
        if (next_payment_date) {
            updates.push('next_payment_date = ?');
            params.push(next_payment_date);
        }
        if (end_date !== undefined) {
            updates.push('end_date = ?');
            params.push(end_date);
        }
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }
        if (memo !== undefined) {
            updates.push('memo = ?');
            params.push(memo);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }
        
        updates.push('updated_at = NOW()');
        
        await executeQuery(
            `UPDATE scheduled_payments SET ${updates.join(', ')} WHERE id = ?`,
            [...params, req.params.id]
        );
        
        res.json({ success: true, message: 'Scheduled payment updated successfully' });
    } catch (error) {
        console.error('Update scheduled payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to update scheduled payment' });
    }
});

/**
 * DELETE /api/bill-pay/scheduled/:id
 * Cancel scheduled payment
 */
router.delete('/scheduled/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const payment = await executeQuery(`
            SELECT sp.* FROM scheduled_payments sp
            JOIN user_billers ub ON sp.user_biller_id = ub.id
            WHERE sp.id = ? AND ub.user_id = ?
        `, [req.params.id, userId]);
        
        if (payment.length === 0) {
            return res.status(404).json({ success: false, message: 'Scheduled payment not found' });
        }
        
        await executeQuery(
            'UPDATE scheduled_payments SET status = "cancelled", cancelled_at = NOW() WHERE id = ?',
            [req.params.id]
        );
        
        res.json({ success: true, message: 'Scheduled payment cancelled' });
    } catch (error) {
        console.error('Cancel scheduled payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel scheduled payment' });
    }
});

// ============================================
// PAYMENTS
// ============================================

/**
 * POST /api/bill-pay/pay
 * Make a one-time payment
 */
router.post('/pay', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const {
            user_biller_id,
            pay_from_account_id,
            amount,
            payment_date,
            payment_type = 'standard',
            memo
        } = req.body;
        
        if (!user_biller_id || !pay_from_account_id || !amount) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // Verify user owns the biller
        const userBiller = await executeQuery(`
            SELECT ub.*, b.biller_name, b.estimated_delivery_days 
            FROM user_billers ub 
            JOIN billers b ON ub.biller_id = b.id 
            WHERE ub.id = ? AND ub.user_id = ?
        `, [user_biller_id, userId]);
        
        if (userBiller.length === 0) {
            await rollback(connection);
            return res.status(404).json({ success: false, message: 'Biller not found' });
        }
        
        // Verify account ownership and balance
        const account = await executeQuery(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND status = "active"',
            [pay_from_account_id, userId]
        );
        
        if (account.length === 0) {
            await rollback(connection);
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        if (parseFloat(account[0].available_balance) < parseFloat(amount)) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }
        
        const paymentId = generatePaymentId();
        const deliveryDays = userBiller[0].estimated_delivery_days || 2;
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);
        
        // Create payment record
        const result = await executeQuery(`
            INSERT INTO bill_payments (
                user_id, user_biller_id, pay_from_account_id, payment_id,
                amount, payment_date, payment_type, status, memo,
                estimated_delivery_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, NOW())
        `, [
            userId, user_biller_id, pay_from_account_id, paymentId,
            amount, payment_date || new Date().toISOString().split('T')[0],
            payment_type, memo, estimatedDelivery.toISOString().split('T')[0]
        ]);
        
        // Hold funds
        await executeQuery(`
            UPDATE accounts 
            SET available_balance = available_balance - ?
            WHERE id = ?
        `, [amount, pay_from_account_id]);
        
        // Update user biller stats
        await executeQuery(`
            UPDATE user_billers 
            SET last_payment_date = CURDATE(), last_payment_amount = ?
            WHERE id = ?
        `, [amount, user_biller_id]);
        
        // Log activity
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'bill_payment', ?, 'payment', ?)
        `, [userId, `Scheduled bill payment of $${amount} to ${userBiller[0].biller_name}`, result.insertId]);
        
        await commit(connection);
        
        res.status(201).json({
            success: true,
            message: 'Payment scheduled successfully',
            data: {
                paymentId,
                payment_id: result.insertId,
                amount: parseFloat(amount),
                biller_name: userBiller[0].biller_name,
                payment_date: payment_date || new Date().toISOString().split('T')[0],
                estimated_delivery: estimatedDelivery.toISOString().split('T')[0],
                status: 'scheduled'
            }
        });
    } catch (error) {
        await rollback(connection);
        console.error('Bill payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to process payment' });
    }
});

/**
 * GET /api/bill-pay/history
 * Get payment history
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, biller_id, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                bp.*,
                b.biller_name,
                b.category,
                a.account_name as pay_from_name
            FROM bill_payments bp
            JOIN user_billers ub ON bp.user_biller_id = ub.id
            JOIN billers b ON ub.biller_id = b.id
            LEFT JOIN accounts a ON bp.pay_from_account_id = a.id
            WHERE bp.user_id = ?
        `;
        const params = [userId];
        
        if (status) {
            query += ' AND bp.status = ?';
            params.push(status);
        }
        
        if (biller_id) {
            query += ' AND ub.biller_id = ?';
            params.push(biller_id);
        }
        
        query += ' ORDER BY bp.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const payments = await executeQuery(query, params);
        
        res.json({ success: true, data: payments });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve payment history' });
    }
});

/**
 * GET /api/bill-pay/payments/:id
 * Get payment details
 */
router.get('/payments/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const payment = await executeQuery(`
            SELECT 
                bp.*,
                b.biller_name,
                b.biller_address,
                b.category,
                a.account_name as pay_from_name,
                a.account_number as pay_from_number
            FROM bill_payments bp
            JOIN user_billers ub ON bp.user_biller_id = ub.id
            JOIN billers b ON ub.biller_id = b.id
            LEFT JOIN accounts a ON bp.pay_from_account_id = a.id
            WHERE bp.id = ? AND bp.user_id = ?
        `, [req.params.id, userId]);
        
        if (payment.length === 0) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        res.json({ success: true, data: payment[0] });
    } catch (error) {
        console.error('Get payment details error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve payment details' });
    }
});

/**
 * POST /api/bill-pay/payments/:id/cancel
 * Cancel a pending payment
 */
router.post('/payments/:id/cancel', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        
        const payment = await executeQuery(
            'SELECT * FROM bill_payments WHERE id = ? AND user_id = ?',
            [req.params.id, userId]
        );
        
        if (payment.length === 0) {
            await rollback(connection);
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }
        
        const p = payment[0];
        
        if (!['scheduled', 'pending'].includes(p.status)) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Payment cannot be cancelled' });
        }
        
        // Release held funds
        await executeQuery(`
            UPDATE accounts SET available_balance = available_balance + ?
            WHERE id = ?
        `, [p.amount, p.pay_from_account_id]);
        
        // Update payment status
        await executeQuery(`
            UPDATE bill_payments SET status = 'cancelled', cancelled_at = NOW()
            WHERE id = ?
        `, [req.params.id]);
        
        await commit(connection);
        
        res.json({ success: true, message: 'Payment cancelled successfully' });
    } catch (error) {
        await rollback(connection);
        console.error('Cancel payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel payment' });
    }
});

/**
 * GET /api/bill-pay/upcoming
 * Get upcoming payments summary
 */
router.get('/upcoming', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 30 } = req.query;
        
        const upcoming = await executeQuery(`
            SELECT 
                bp.id,
                bp.payment_id,
                bp.amount,
                bp.payment_date,
                bp.estimated_delivery_date,
                bp.status,
                b.biller_name,
                a.account_name as pay_from_name
            FROM bill_payments bp
            JOIN user_billers ub ON bp.user_biller_id = ub.id
            JOIN billers b ON ub.biller_id = b.id
            LEFT JOIN accounts a ON bp.pay_from_account_id = a.id
            WHERE bp.user_id = ? 
            AND bp.payment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            AND bp.status IN ('scheduled', 'pending', 'processing')
            ORDER BY bp.payment_date ASC
        `, [userId, parseInt(days)]);
        
        const total = upcoming.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        res.json({
            success: true,
            data: {
                payments: upcoming,
                total_amount: total,
                count: upcoming.length
            }
        });
    } catch (error) {
        console.error('Get upcoming payments error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve upcoming payments' });
    }
});

/**
 * GET /api/bill-pay/e-bills
 * Get e-bills (electronic bills)
 */
router.get('/e-bills', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const eBills = await executeQuery(`
            SELECT 
                eb.*,
                b.biller_name,
                ub.account_number_masked
            FROM e_bills eb
            JOIN user_billers ub ON eb.user_biller_id = ub.id
            JOIN billers b ON ub.biller_id = b.id
            WHERE ub.user_id = ?
            ORDER BY eb.due_date ASC
        `, [userId]);
        
        res.json({ success: true, data: eBills });
    } catch (error) {
        console.error('Get e-bills error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve e-bills' });
    }
});

module.exports = router;