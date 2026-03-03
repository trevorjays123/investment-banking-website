/**
 * Investment Banking Platform - Account Management Routes
 * Handles multiple account types, external accounts, and account operations
 */

const express = require('express');
const router = express.Router();
const { executeQuery, beginTransaction, commit, rollback } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateAccountCreation, validateExternalAccount } = require('../middleware/validation');

// Generate unique account number
function generateAccountNumber(typeCode) {
    const prefix = {
        'individual_brokerage': 'IB',
        'joint_brokerage': 'JB',
        'traditional_ira': 'TI',
        'roth_ira': 'RI',
        'rollover_ira': 'RL',
        'sep_ira': 'SP',
        'simple_ira': 'SI',
        'custodial': 'CU',
        'trust': 'TR',
        'corporate': 'CO',
        'partnership': 'PA',
        'checking': 'CK',
        'savings': 'SV',
        'money_market': 'MM',
        'margin': 'MG'
    };
    const pre = prefix[typeCode] || 'AC';
    const random = Math.floor(Math.random() * 900000000) + 100000000;
    return `${pre}${random}`;
}

// ============================================
// ACCOUNT TYPE ROUTES
// ============================================

/**
 * GET /api/accounts/types
 * Get all available account types
 */
router.get('/types', authenticateToken, async (req, res) => {
    try {
        const types = await executeQuery(
            'SELECT * FROM account_types ORDER BY type_name'
        );
        res.json({ success: true, data: types });
    } catch (error) {
        console.error('Get account types error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve account types' });
    }
});

// ============================================
// USER ACCOUNTS ROUTES
// ============================================

/**
 * GET /api/accounts
 * Get all accounts for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const accounts = await executeQuery(`
            SELECT 
                a.*,
                at.type_code,
                at.type_name,
                at.is_tax_advantaged,
                at.tax_advantage_type,
                at.margin_eligible,
                (SELECT SUM(market_value) FROM positions WHERE account_id = a.id) as portfolio_value,
                (SELECT COUNT(*) FROM positions WHERE account_id = a.id AND quantity > 0) as holdings_count
            FROM accounts a
            JOIN account_types at ON a.account_type_id = at.id
            WHERE a.user_id = ?
            ORDER BY a.created_at DESC
        `, [userId]);
        
        // Calculate total net worth
        const totalNetWorth = accounts.reduce((sum, acc) => {
            return sum + parseFloat(acc.balance || 0) + parseFloat(acc.portfolio_value || 0);
        }, 0);
        
        res.json({ 
            success: true, 
            data: accounts,
            summary: {
                totalAccounts: accounts.length,
                totalNetWorth,
                activeAccounts: accounts.filter(a => a.status === 'active').length
            }
        });
    } catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve accounts' });
    }
});

/**
 * GET /api/accounts/:id
 * Get detailed account information
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        
        // Get account details
        const accounts = await executeQuery(`
            SELECT 
                a.*,
                at.type_code,
                at.type_name,
                at.description as account_type_description,
                at.is_tax_advantaged,
                at.tax_advantage_type,
                at.margin_eligible,
                at.options_eligible,
                at.interest_rate
            FROM accounts a
            JOIN account_types at ON a.account_type_id = at.id
            WHERE a.id = ? AND a.user_id = ?
        `, [accountId, userId]);
        
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        const account = accounts[0];
        
        // Get positions
        const positions = await executeQuery(`
            SELECT 
                p.*,
                s.symbol,
                s.company_name,
                s.security_type,
                s.exchange,
                s.sector,
                s.industry,
                s.dividend_yield,
                s.logo_url
            FROM positions p
            JOIN securities s ON p.security_id = s.id
            WHERE p.account_id = ? AND p.quantity > 0
            ORDER BY p.market_value DESC
        `, [accountId]);
        
        // Get recent transactions
        const transactions = await executeQuery(`
            SELECT * FROM transactions
            WHERE account_id = ?
            ORDER BY created_at DESC
            LIMIT 20
        `, [accountId]);
        
        // Get pending orders
        const pendingOrders = await executeQuery(`
            SELECT 
                o.*,
                s.symbol,
                s.company_name
            FROM orders o
            JOIN securities s ON o.security_id = s.id
            WHERE o.account_id = ? AND o.status IN ('pending', 'open', 'partially_filled')
            ORDER BY o.requested_at DESC
        `, [accountId]);
        
        res.json({
            success: true,
            data: {
                account,
                positions,
                transactions,
                pendingOrders,
                summary: {
                    totalValue: parseFloat(account.balance || 0) + positions.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0),
                    cashBalance: account.balance,
                    portfolioValue: positions.reduce((sum, p) => sum + parseFloat(p.market_value || 0), 0),
                    unrealizedGainLoss: positions.reduce((sum, p) => sum + parseFloat(p.unrealized_gain_loss || 0), 0),
                    holdingsCount: positions.length
                }
            }
        });
    } catch (error) {
        console.error('Get account details error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve account details' });
    }
});

/**
 * POST /api/accounts
 * Create a new account
 */
router.post('/', authenticateToken, validateAccountCreation, async (req, res) => {
    const connection = await beginTransaction();
    
    try {
        const userId = req.user.id;
        const { 
            account_type_id, 
            account_name,
            margin_enabled = false,
            drip_enabled = false,
            initial_deposit = 0
        } = req.body;
        
        // Get account type details
        const accountTypes = await executeQuery(
            'SELECT * FROM account_types WHERE id = ?',
            [account_type_id]
        );
        
        if (accountTypes.length === 0) {
            await rollback(connection);
            return res.status(400).json({ success: false, message: 'Invalid account type' });
        }
        
        const accountType = accountTypes[0];
        
        // Generate account number
        const accountNumber = generateAccountNumber(accountType.type_code);
        
        // Check margin eligibility
        if (margin_enabled && !accountType.margin_eligible) {
            await rollback(connection);
            return res.status(400).json({ 
                success: false, 
                message: 'Margin trading is not available for this account type' 
            });
        }
        
        // Create account
        const result = await executeQuery(`
            INSERT INTO accounts (
                user_id, account_type_id, account_number, account_name,
                status, balance, available_balance, margin_enabled, drip_enabled,
                fractional_shares_enabled, kyc_verified, daily_transfer_limit
            ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, TRUE, FALSE, 50000.00)
        `, [
            userId, 
            account_type_id, 
            accountNumber, 
            account_name || accountType.type_name,
            initial_deposit,
            initial_deposit,
            margin_enabled ? 1 : 0,
            drip_enabled ? 1 : 0
        ]);
        
        // Log activity
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'account_created', ?, 'account', ?)
        `, [userId, `Created ${accountType.type_name} account`, result.insertId]);
        
        await commit(connection);
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully. Account is pending verification.',
            data: {
                accountId: result.insertId,
                accountNumber,
                accountType: accountType.type_name,
                status: 'pending'
            }
        });
    } catch (error) {
        await rollback(connection);
        console.error('Create account error:', error);
        res.status(500).json({ success: false, message: 'Failed to create account' });
    }
});

/**
 * PUT /api/accounts/:id
 * Update account settings
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        const {
            account_name,
            drip_enabled,
            fractional_shares_enabled
        } = req.body;
        
        // Verify account ownership
        const accounts = await executeQuery(
            'SELECT * FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );
        
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        await executeQuery(`
            UPDATE accounts 
            SET account_name = ?, drip_enabled = ?, fractional_shares_enabled = ?
            WHERE id = ? AND user_id = ?
        `, [account_name, drip_enabled, fractional_shares_enabled, accountId, userId]);
        
        res.json({ success: true, message: 'Account updated successfully' });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({ success: false, message: 'Failed to update account' });
    }
});

/**
 * POST /api/accounts/:id/freeze
 * Freeze an account
 */
router.post('/:id/freeze', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        const { reason } = req.body;
        
        const result = await executeQuery(`
            UPDATE accounts 
            SET status = 'frozen'
            WHERE id = ? AND user_id = ? AND status = 'active'
        `, [accountId, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Account not found or cannot be frozen' 
            });
        }
        
        // Log activity
        await executeQuery(`
            INSERT INTO user_activity_log (user_id, activity_type, activity_description, related_entity_type, related_entity_id)
            VALUES (?, 'account_frozen', ?, 'account', ?)
        `, [userId, reason || 'Account frozen by user', accountId]);
        
        res.json({ success: true, message: 'Account frozen successfully' });
    } catch (error) {
        console.error('Freeze account error:', error);
        res.status(500).json({ success: false, message: 'Failed to freeze account' });
    }
});

/**
 * POST /api/accounts/:id/unfreeze
 * Unfreeze an account
 */
router.post('/:id/unfreeze', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        
        const result = await executeQuery(`
            UPDATE accounts 
            SET status = 'active'
            WHERE id = ? AND user_id = ? AND status = 'frozen'
        `, [accountId, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Account not found or cannot be unfrozen' 
            });
        }
        
        res.json({ success: true, message: 'Account unfrozen successfully' });
    } catch (error) {
        console.error('Unfreeze account error:', error);
        res.status(500).json({ success: false, message: 'Failed to unfreeze account' });
    }
});

// ============================================
// EXTERNAL ACCOUNTS ROUTES
// ============================================

/**
 * GET /api/accounts/external/list
 * Get all linked external accounts
 */
router.get('/external/list', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const accounts = await executeQuery(`
            SELECT 
                id, institution_name, account_name, account_type, 
                account_number_masked, balance, verification_status,
                is_primary, nickname, created_at, verified_at
            FROM external_accounts
            WHERE user_id = ? AND is_active = TRUE
            ORDER BY is_primary DESC, created_at DESC
        `, [userId]);
        
        res.json({ success: true, data: accounts });
    } catch (error) {
        console.error('Get external accounts error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve external accounts' });
    }
});

/**
 * POST /api/accounts/external
 * Link an external bank account
 */
router.post('/external', authenticateToken, validateExternalAccount, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            institution_name,
            account_name,
            account_type,
            account_number,
            routing_number,
            nickname
        } = req.body;
        
        // Mask account number (show last 4)
        const accountNumberMasked = '****' + account_number.slice(-4);
        
        // In production, encrypt the full account number
        // const encryptedAccountNumber = encrypt(account_number);
        
        // Generate micro-deposits for verification
        const microDeposit1 = (Math.random() * 0.99 + 0.01).toFixed(2);
        const microDeposit2 = (Math.random() * 0.99 + 0.01).toFixed(2);
        
        const result = await executeQuery(`
            INSERT INTO external_accounts (
                user_id, institution_name, account_name, account_type,
                account_number_masked, routing_number,
                verification_status, verification_method,
                micro_deposit_1, micro_deposit_2, micro_deposits_sent_at,
                is_primary, nickname
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'micro_deposits', ?, ?, NOW(), 
                (SELECT IF(COUNT(*) = 0, TRUE, FALSE) FROM external_accounts WHERE user_id = ? AND is_active = TRUE), ?)
        `, [userId, institution_name, account_name, account_type, accountNumberMasked, routing_number, 
            microDeposit1, microDeposit2, userId, nickname]);
        
        res.status(201).json({
            success: true,
            message: 'External account added. Two micro-deposits have been sent to verify your account.',
            data: {
                externalAccountId: result.insertId,
                verificationMethod: 'micro_deposits',
                accountMasked: accountNumberMasked
            }
        });
    } catch (error) {
        console.error('Add external account error:', error);
        res.status(500).json({ success: false, message: 'Failed to add external account' });
    }
});

/**
 * POST /api/accounts/external/:id/verify
 * Verify external account with micro-deposits
 */
router.post('/external/:id/verify', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const externalId = req.params.id;
        const { amount1, amount2 } = req.body;
        
        // Get external account
        const accounts = await executeQuery(`
            SELECT * FROM external_accounts
            WHERE id = ? AND user_id = ? AND is_active = TRUE
        `, [externalId, userId]);
        
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'External account not found' });
        }
        
        const account = accounts[0];
        
        if (account.verification_status === 'verified') {
            return res.status(400).json({ success: false, message: 'Account already verified' });
        }
        
        // Verify micro-deposits
        if (parseFloat(amount1) === parseFloat(account.micro_deposit_1) && 
            parseFloat(amount2) === parseFloat(account.micro_deposit_2)) {
            
            await executeQuery(`
                UPDATE external_accounts
                SET verification_status = 'verified', verified_at = NOW()
                WHERE id = ?
            `, [externalId]);
            
            res.json({ success: true, message: 'External account verified successfully' });
        } else {
            // Increment failed attempts (would need to add this column)
            res.status(400).json({ 
                success: false, 
                message: 'Verification amounts do not match. Please try again.' 
            });
        }
    } catch (error) {
        console.error('Verify external account error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify external account' });
    }
});

/**
 * DELETE /api/accounts/external/:id
 * Remove an external account
 */
router.delete('/external/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const externalId = req.params.id;
        
        const result = await executeQuery(`
            UPDATE external_accounts
            SET is_active = FALSE
            WHERE id = ? AND user_id = ?
        `, [externalId, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'External account not found' });
        }
        
        res.json({ success: true, message: 'External account removed successfully' });
    } catch (error) {
        console.error('Remove external account error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove external account' });
    }
});

/**
 * POST /api/accounts/external/:id/set-primary
 * Set an external account as primary
 */
router.post('/external/:id/set-primary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const externalId = req.params.id;
        
        // Verify account exists and is verified
        const accounts = await executeQuery(`
            SELECT * FROM external_accounts
            WHERE id = ? AND user_id = ? AND is_active = TRUE AND verification_status = 'verified'
        `, [externalId, userId]);
        
        if (accounts.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'External account not found or not verified' 
            });
        }
        
        // Unset current primary
        await executeQuery(`
            UPDATE external_accounts
            SET is_primary = FALSE
            WHERE user_id = ? AND is_active = TRUE
        `, [userId]);
        
        // Set new primary
        await executeQuery(`
            UPDATE external_accounts
            SET is_primary = TRUE
            WHERE id = ?
        `, [externalId]);
        
        res.json({ success: true, message: 'Primary account updated successfully' });
    } catch (error) {
        console.error('Set primary account error:', error);
        res.status(500).json({ success: false, message: 'Failed to set primary account' });
    }
});

// ============================================
// BENEFICIARY ROUTES
// ============================================

/**
 * GET /api/accounts/:id/beneficiaries
 * Get beneficiaries for an account
 */
router.get('/:id/beneficiaries', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        
        // Verify ownership
        const accounts = await executeQuery(
            'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );
        
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        const beneficiaries = await executeQuery(`
            SELECT 
                id, beneficiary_type, first_name, last_name, 
                relationship, percentage, created_at
            FROM beneficiaries
            WHERE account_id = ?
            ORDER BY beneficiary_type, percentage DESC
        `, [accountId]);
        
        res.json({ success: true, data: beneficiaries });
    } catch (error) {
        console.error('Get beneficiaries error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve beneficiaries' });
    }
});

/**
 * POST /api/accounts/:id/beneficiaries
 * Add a beneficiary to an account
 */
router.post('/:id/beneficiaries', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        const {
            beneficiary_type = 'primary',
            first_name,
            last_name,
            date_of_birth,
            relationship,
            percentage,
            address_line1,
            city,
            state,
            postal_code,
            phone,
            email
        } = req.body;
        
        // Verify ownership
        const accounts = await executeQuery(
            'SELECT id FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );
        
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        
        // Check total percentage doesn't exceed 100%
        const currentTotal = await executeQuery(`
            SELECT COALESCE(SUM(percentage), 0) as total
            FROM beneficiaries
            WHERE account_id = ? AND beneficiary_type = ?
        `, [accountId, beneficiary_type]);
        
        if (parseFloat(currentTotal[0].total) + parseFloat(percentage) > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Total beneficiary percentage cannot exceed 100%' 
            });
        }
        
        const result = await executeQuery(`
            INSERT INTO beneficiaries (
                account_id, beneficiary_type, first_name, last_name,
                date_of_birth, relationship, percentage,
                address_line1, city, state, postal_code, phone, email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [accountId, beneficiary_type, first_name, last_name, date_of_birth, 
            relationship, percentage, address_line1, city, state, postal_code, phone, email]);
        
        res.status(201).json({
            success: true,
            message: 'Beneficiary added successfully',
            data: { beneficiaryId: result.insertId }
        });
    } catch (error) {
        console.error('Add beneficiary error:', error);
        res.status(500).json({ success: false, message: 'Failed to add beneficiary' });
    }
});

/**
 * DELETE /api/accounts/:id/beneficiaries/:beneficiaryId
 * Remove a beneficiary
 */
router.delete('/:id/beneficiaries/:beneficiaryId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const accountId = req.params.id;
        const beneficiaryId = req.params.beneficiaryId;
        
        // Verify ownership through account
        const result = await executeQuery(`
            DELETE b FROM beneficiaries b
            JOIN accounts a ON b.account_id = a.id
            WHERE b.id = ? AND a.id = ? AND a.user_id = ?
        `, [beneficiaryId, accountId, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Beneficiary not found' });
        }
        
        res.json({ success: true, message: 'Beneficiary removed successfully' });
    } catch (error) {
        console.error('Remove beneficiary error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove beneficiary' });
    }
});

// ============================================
// INVESTMENT GOALS ROUTES
// ============================================

/**
 * GET /api/accounts/goals
 * Get all investment goals for user
 */
router.get('/goals/all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const goals = await executeQuery(`
            SELECT 
                g.*,
                a.account_name,
                a.account_number
            FROM investment_goals g
            LEFT JOIN accounts a ON g.account_id = a.id
            WHERE g.user_id = ?
            ORDER BY g.status = 'active' DESC, g.target_date ASC
        `, [userId]);
        
        res.json({ success: true, data: goals });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve goals' });
    }
});

/**
 * POST /api/accounts/goals
 * Create an investment goal
 */
router.post('/goals', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            account_id,
            goal_name,
            goal_type,
            target_amount,
            target_date,
            monthly_contribution,
            risk_tolerance
        } = req.body;
        
        const result = await executeQuery(`
            INSERT INTO investment_goals (
                user_id, account_id, goal_name, goal_type,
                target_amount, target_date, monthly_contribution, risk_tolerance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, account_id, goal_name, goal_type, target_amount, target_date, 
            monthly_contribution, risk_tolerance]);
        
        res.status(201).json({
            success: true,
            message: 'Investment goal created successfully',
            data: { goalId: result.insertId }
        });
    } catch (error) {
        console.error('Create goal error:', error);
        res.status(500).json({ success: false, message: 'Failed to create goal' });
    }
});

/**
 * PUT /api/accounts/goals/:id
 * Update an investment goal
 */
router.put('/goals/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const goalId = req.params.id;
        const {
            goal_name,
            target_amount,
            target_date,
            monthly_contribution,
            risk_tolerance,
            status
        } = req.body;
        
        await executeQuery(`
            UPDATE investment_goals
            SET goal_name = ?, target_amount = ?, target_date = ?,
                monthly_contribution = ?, risk_tolerance = ?, status = ?
            WHERE id = ? AND user_id = ?
        `, [goal_name, target_amount, target_date, monthly_contribution, 
            risk_tolerance, status, goalId, userId]);
        
        res.json({ success: true, message: 'Goal updated successfully' });
    } catch (error) {
        console.error('Update goal error:', error);
        res.status(500).json({ success: false, message: 'Failed to update goal' });
    }
});

/**
 * DELETE /api/accounts/goals/:id
 * Delete an investment goal
 */
router.delete('/goals/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const goalId = req.params.id;
        
        const result = await executeQuery(`
            DELETE FROM investment_goals
            WHERE id = ? AND user_id = ?
        `, [goalId, userId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Goal not found' });
        }
        
        res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Delete goal error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete goal' });
    }
});

module.exports = router;