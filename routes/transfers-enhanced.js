/**
 * Investment Banking Platform - Transfers Routes
 * Handles ACH, Wire, Internal, ACATS, and Instant transfers
 */

const express = require('express');
const router = express.Router();
const { executeQuery, beginTransaction, commit, rollback } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Generate reference number
function generateReferenceNumber(prefix = 'TRF') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

// Get fee by code
async function getFee(feeCode) {
    const fees = await executeQuery(
        'SELECT * FROM fee_schedules WHERE fee_code = ? AND is_active = TRUE',
        [feeCode]
    );
    return fees.length > 0 ? fees[0] : null;
}

// Check daily transfer limits
async function checkDailyTransferLimit(userId, accountId, amount) {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await executeQuery(`
        SELECT COALESCE(SUM(amount), 0) as total_transferred
        FROM transfers
        WHERE user_id = ? 
        AND (from_account_id = ? OR to_account_id = ?)
        AND DATE(created_at) = ?
        AND status NOT IN ('failed', 'cancelled')
    `, [userId, accountId, accountId, today]);
    
    const account = await executeQuery(
        'SELECT daily_transfer_limit FROM accounts WHERE id = ?',
        [accountId]
    );
    
    const limit = account.length > 0 ? parseFloat(account[0].daily_transfer_limit) : 50000;
    const totalTransferred = parseFloat(result[0].total_transferred);
    
    return {
        withinLimit: totalTransferred + parseFloat(amount) <= limit,
        currentTotal: totalTransferred,
        limit,
        remaining: Math.max(0, limit - totalTransferred)
    };
}

// ============================================
// TRANSFER LIMITS AND INFO
// ============================================

/**
 * GET /api/transfers/limits
 * Get transfer limits for user's accounts
 */
router.get('/limits', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const limits = await executeQuery(`
            SELECT 
                a.id as account_id,
                a.account_number,
                a.account_name,
                a.daily_transfer_limit,
                a.daily_withdrawal_limit,
                at.type_name as account_type,
                (SELECT COALESCE(SUM(amount), 0) FROM transfers 
                 WHERE (from_account_id = a.id OR to_account_id = a.id)
                 AND DATE(created_at) = CURDATE()
                 AND status NOT IN ('failed', 'cancelled')) as today_transferred
            FROM accounts a
            JOIN account_types at ON a.account_type_id = at.id
            WHERE a.user_id = ? AND a.status = 'active'
        `, [userId]);
        
        res.json({ success: true, data: limits });
    } catch (error) {
        console.error('Get limits error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transfer limits' });
    }
});

/**
 * GET /api/transfers/fees
 * Get fee schedule for transfers
 */
router.get('/fees', authenticateToken, async (req, res) => {
    try {
        const fees = await executeQuery(`
            SELECT fee_code, fee_name, fee_description, fee_type, 
                   amount, percentage, minimum_fee, maximum_fee
            FROM fee_schedules
            WHERE is_active = TRUE
            AND fee_code IN ('ACH_STANDARD', 'ACH_INSTANT', 'WIRE_DOMESTIC', 'WIRE_INTERNATIONAL', 'CHECK_ISSUANCE')
        `);
        
        res.json({ success: true, data: fees });
    } catch (error) {
        console.error('Get fees error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve fees' });
    }
});

// ============================================
// ACH TRANSFERS
// ============================================

/**
 * POST /api/transfers/ach
 * Initiate an ACH transfer
 */
router.post('/ach', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const {
            from_account_id,
            to_account_id,
            external_account_id,
            direction,
            amount,
            priority = 'standard',
            scheduled_date,
            recurring,
            recurring_frequency,
            recurring_end_date,
            memo
        } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        
        let feeCode = 'ACH_STANDARD';
        let feeAmount = 0;
        
        if (priority === 'instant') {
            const fee = await getFee('ACH_INSTANT');
            feeAmount = Math.max(parseFloat(amount) * (parseFloat(fee?.percentage || 1.5) / 100), parseFloat(fee?.minimum_fee || 0.25));
            feeCode = 'ACH_INSTANT';
        }
        
        if (direction === 'outgoing' && from_account_id) {
            const limitCheck = await checkDailyTransferLimit(userId, from_account_id, amount);
            if (!limitCheck.withinLimit) {
                await rollback(connection);
                return res.status(400).json({ 
                    success: false, 
                    message: `Daily transfer limit exceeded. Remaining: $${limitCheck.remaining.toFixed(2)}` 
                });
            }
            
            const accountCheck = await executeQuery(
                'SELECT available_balance FROM accounts WHERE id = ? AND user_id = ?',
                [from_account_id, userId]
            );
            
            if (accountCheck.length === 0) {
                await rollback(connection);
                return res.status(404).json({ success: false, message: 'Account not found' });
            }
            
            const availableBalance = parseFloat(accountCheck[0].available_balance);
            if (availableBalance < parseFloat(amount) + feeAmount) {
                await rollback(connection);
                return res.status(400).json({ success: false, message: 'Insufficient available balance' });
            }
        }
        
        if (external_account_id) {
            const extAccount = await executeQuery(
                'SELECT * FROM external_accounts WHERE id = ? AND user_id = ? AND verification_status = ? AND is_active = TRUE',
                [external_account_id, userId, 'verified']
            );
            
            if (extAccount.length === 0) {
                await rollback(connection);
                return res.status(400).json({ success: false, message: 'External account not found or not verified' });
            }
        }
        
        const referenceNumber = generateReferenceNumber('ACH');
        
        const result = await executeQuery(`
            INSERT INTO transfers (
                user_id, transfer_type, transfer_direction,
                from_account_id, to_account_id, from_external_account_id, to_external_account_id,
                amount, status, priority, fee_amount, reference_number, description,
                scheduled_date, recurring, recurring_frequency, recurring_end_date
            ) VALUES (?, 'ach', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId, direction,
            direction === 'outgoing' ? from_account_id : null,
            direction === 'incoming' ? to_account_id : null,
            direction === 'incoming' ? external_account_id : null,
            direction === 'outgoing' ? external_account_id : null,
            amount, priority, feeAmount, referenceNumber, memo,
            scheduled_date || null, recurring || false, recurring_frequency || null, recurring_end_date || null
        ]);
        
        if (priority === 'instant' || priority === 'same_day') {
            await executeQuery('UPDATE transfers SET status = ? WHERE id = ?', ['processing', result.insertId]);
        }
        
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'transfer_initiated', ?, 'transfer', ?)
        `, [userId, `Initiated ${priority} ACH ${direction} of $${amount}`, result.insertId]);
        
        await commit(connection);
        
        res.status(201).json({
            success: true,
            message: `ACH ${direction} initiated successfully`,
            data: {
                transferId: result.insertId,
                referenceNumber,
                status: 'pending',
                amount: parseFloat(amount),
                fee: feeAmount,
                estimatedArrival: priority === 'instant' ? 'Within minutes' : priority === 'same_day' ? 'Today' : '1-3 business days'
            }
        });
    } catch (error) {
        await rollback(connection);
        console.error('ACH transfer error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate ACH transfer' });
    }
});

// ============================================
// WIRE TRANSFERS
// ============================================

/**
 * POST /api/transfers/wire
 * Initiate a wire transfer
 */
router.post('/wire', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const {
            from_account_id,
            amount,
            is_international = false,
            to_routing_number,
            to_account_number,
            to_account_name,
            to_institution_name,
            wire_swift_code,
            iban,
            beneficiary_bank_country,
            wire_beneficiary_name,
            wire_beneficiary_address,
            wire_intermediary_bank,
            wire_reference,
            scheduled_date,
            memo
        } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        
        if (!from_account_id) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Source account required' });
        }
        
        const feeCode = is_international ? 'WIRE_INTERNATIONAL' : 'WIRE_DOMESTIC';
        const fee = await getFee(feeCode);
        const feeAmount = fee ? parseFloat(fee.amount) : (is_international ? 45 : 25);
        
        const limitCheck = await checkDailyTransferLimit(userId, from_account_id, amount);
        if (!limitCheck.withinLimit) {
            await rollback(connection);
            return res.status(400).json({ 
                success: false, 
                message: `Daily transfer limit exceeded. Remaining: $${limitCheck.remaining.toFixed(2)}` 
            });
        }
        
        const accountCheck = await executeQuery(
            'SELECT available_balance FROM accounts WHERE id = ? AND user_id = ? AND status = ?',
            [from_account_id, userId, 'active']
        );
        
        if (accountCheck.length === 0) {
            await rollback(connection);
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        const availableBalance = parseFloat(accountCheck[0].available_balance);
        const totalRequired = parseFloat(amount) + feeAmount;
        
        if (availableBalance < totalRequired) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: `Insufficient balance. Required: $${totalRequired.toFixed(2)}` });
        }
        
        const referenceNumber = generateReferenceNumber('WIR');
        
        const result = await executeQuery(`
            INSERT INTO transfers (
                user_id, transfer_type, transfer_direction,
                from_account_id, to_account_number_encrypted, to_account_name,
                to_institution_name, to_routing_number,
                amount, status, priority, is_international,
                wire_swift_code, iban, beneficiary_bank_country,
                wire_beneficiary_name, wire_beneficiary_address, wire_intermediary_bank,
                wire_reference, wire_fees, fee_amount, reference_number,
                description, scheduled_date, review_required
            ) VALUES (?, 'wire', 'outgoing', ?, ?, ?, ?, ?, ?, 'pending', 'next_day', ?, 
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `, [
            userId, from_account_id, to_account_number, to_account_name,
            to_institution_name, to_routing_number,
            amount, is_international,
            wire_swift_code, iban, beneficiary_bank_country,
            wire_beneficiary_name, wire_beneficiary_address, wire_intermediary_bank,
            wire_reference, feeAmount, feeAmount, referenceNumber,
            memo, scheduled_date || null
        ]);
        
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'wire_initiated', ?, 'transfer', ?)
        `, [userId, `Initiated ${is_international ? 'international' : 'domestic'} wire transfer of $${amount}`, result.insertId]);
        
        await commit(connection);
        
        res.status(201).json({
            success: true,
            message: 'Wire transfer initiated. Pending review.',
            data: {
                transferId: result.insertId,
                referenceNumber,
                status: 'pending',
                amount: parseFloat(amount),
                fee: feeAmount,
                isInternational: is_international,
                estimatedCompletion: is_international ? '1-5 business days' : 'Same or next business day'
            }
        });
    } catch (error) {
        await rollback(connection);
        console.error('Wire transfer error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate wire transfer' });
    }
});

// ============================================
// INTERNAL TRANSFERS
// ============================================

/**
 * POST /api/transfers/internal
 * Transfer between own accounts
 */
router.post('/internal', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const { from_account_id, to_account_id, amount, memo } = req.body;
        
        if (!from_account_id || !to_account_id) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Both source and destination accounts required' });
        }
        
        if (from_account_id === to_account_id) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Cannot transfer to the same account' });
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        
        const accounts = await executeQuery(`
            SELECT id, account_name, available_balance, account_type_id
            FROM accounts 
            WHERE id IN (?, ?) AND user_id = ? AND status = 'active'
        `, [from_account_id, to_account_id, userId]);
        
        if (accounts.length !== 2) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'One or both accounts not found or inactive' });
        }
        
        const fromAccount = accounts.find(a => a.id == from_account_id);
        const toAccount = accounts.find(a => a.id == to_account_id);
        
        if (parseFloat(fromAccount.available_balance) < parseFloat(amount)) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }
        
        const referenceNumber = generateReferenceNumber('INT');
        
        // Create transfer record
        const result = await executeQuery(`
            INSERT INTO transfers (
                user_id, transfer_type, transfer_direction,
                from_account_id, to_account_id,
                amount, status, priority, fee_amount, reference_number, description
            ) VALUES (?, 'internal', 'outgoing', ?, ?, ?, 'completed', 'instant', 0, ?, ?)
        `, [userId, from_account_id, to_account_id, amount, referenceNumber, memo]);
        
        // Update source account balance
        await executeQuery(`
            UPDATE accounts 
            SET balance = balance - ?, available_balance = available_balance - ?
            WHERE id = ?
        `, [amount, amount, from_account_id]);
        
        // Update destination account balance
        await executeQuery(`
            UPDATE accounts 
            SET balance = balance + ?, available_balance = available_balance + ?
            WHERE id = ?
        `, [amount, amount, to_account_id]);
        
        // Create transactions for both accounts
        const transactionId1 = generateReferenceNumber('TXN');
        const transactionId2 = generateReferenceNumber('TXN');
        
        await executeQuery(`
            INSERT INTO transactions (account_id, user_id, transaction_id, transaction_type, category, 
                amount, status, description, related_account_id, related_transfer_id, transaction_date)
            VALUES (?, ?, ?, 'internal_transfer', 'transfer', ?, 'completed', ?, ?, ?, CURDATE())
        `, [from_account_id, userId, transactionId1, -parseFloat(amount), 
            `Transfer to ${toAccount.account_name}`, to_account_id, result.insertId]);
        
        await executeQuery(`
            INSERT INTO transactions (account_id, user_id, transaction_id, transaction_type, category,
                amount, status, description, related_account_id, related_transfer_id, transaction_date)
            VALUES (?, ?, ?, 'internal_transfer', 'transfer', ?, 'completed', ?, ?, ?, CURDATE())
        `, [to_account_id, userId, transactionId2, parseFloat(amount), 
            `Transfer from ${fromAccount.account_name}`, from_account_id, result.insertId]);
        
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'internal_transfer', ?, 'transfer', ?)
        `, [userId, `Internal transfer of $${amount} from ${fromAccount.account_name} to ${toAccount.account_name}`, result.insertId]);
        
        await commit(connection);
        
        res.json({
            success: true,
            message: 'Transfer completed successfully',
            data: {
                transferId: result.insertId,
                referenceNumber,
                status: 'completed',
                amount: parseFloat(amount),
                fee: 0,
                fromAccount: fromAccount.account_name,
                toAccount: toAccount.account_name
            }
        });
    } catch (error) {
        await rollback(connection);
        console.error('Internal transfer error:', error);
        res.status(500).json({ success: false, message: 'Failed to complete internal transfer' });
    }
});

// ============================================
// TRANSFER HISTORY
// ============================================

/**
 * GET /api/transfers/history
 * Get transfer history for user
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                t.*,
                fa.account_name as from_account_name,
                ta.account_name as to_account_name,
                ea.institution_name as external_institution,
                ea.account_number_masked as external_account_masked
            FROM transfers t
            LEFT JOIN accounts fa ON t.from_account_id = fa.id
            LEFT JOIN accounts ta ON t.to_account_id = ta.id
            LEFT JOIN external_accounts ea ON (t.from_external_account_id = ea.id OR t.to_external_account_id = ea.id)
            WHERE t.user_id = ?
        `;
        
        const params = [userId];
        
        if (type) {
            query += ' AND t.transfer_type = ?';
            params.push(type);
        }
        
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const transfers = await executeQuery(query, params);
        
        res.json({ success: true, data: transfers });
    } catch (error) {
        console.error('Get transfer history error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transfer history' });
    }
});

/**
 * GET /api/transfers/:id
 * Get transfer details
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const transferId = req.params.id;
        
        const transfer = await executeQuery(`
            SELECT 
                t.*,
                fa.account_name as from_account_name,
                fa.account_number as from_account_number,
                ta.account_name as to_account_name,
                ta.account_number as to_account_number,
                ea.institution_name as external_institution,
                ea.account_number_masked as external_account_masked
            FROM transfers t
            LEFT JOIN accounts fa ON t.from_account_id = fa.id
            LEFT JOIN accounts ta ON t.to_account_id = ta.id
            LEFT JOIN external_accounts ea ON (t.from_external_account_id = ea.id OR t.to_external_account_id = ea.id)
            WHERE t.id = ? AND t.user_id = ?
        `, [transferId, userId]);
        
        if (transfer.length === 0) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        
        res.json({ success: true, data: transfer[0] });
    } catch (error) {
        console.error('Get transfer details error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transfer details' });
    }
});

/**
 * POST /api/transfers/:id/cancel
 * Cancel a pending transfer
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const transferId = req.params.id;
        const { reason } = req.body;
        
        const transfer = await executeQuery(
            'SELECT * FROM transfers WHERE id = ? AND user_id = ?',
            [transferId, userId]
        );
        
        if (transfer.length === 0) {
            await rollback(connection);
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        
        const t = transfer[0];
        
        if (!['pending', 'scheduled'].includes(t.status)) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Transfer cannot be cancelled' });
        }
        
        await executeQuery(`
            UPDATE transfers 
            SET status = 'cancelled', cancelled_at = NOW(), notes = ?
            WHERE id = ?
        `, [reason || 'Cancelled by user', transferId]);
        
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'transfer_cancelled', ?, 'transfer', ?)
        `, [userId, `Cancelled transfer ${t.reference_number}`, transferId]);
        
        await commit(connection);
        
        res.json({ success: true, message: 'Transfer cancelled successfully' });
    } catch (error) {
        await rollback(connection);
        console.error('Cancel transfer error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel transfer' });
    }
});

module.exports = router;