const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { promisify } = require('util');

const router = express.Router();

// GET /api/profile - Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await executeQuery(
      `SELECT id, email, first_name, last_name, phone, date_of_birth, address, 
              email_verified, two_factor_enabled, created_at, updated_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user accounts (masked)
    const accounts = await executeQuery(
      `SELECT id, account_number, account_type, balance, currency, status 
       FROM accounts WHERE user_id = ?`,
      [req.user.id]
    );

    // Mask account numbers
    const maskedAccounts = accounts.map(acc => ({
      ...acc,
      account_number: maskAccountNumber(acc.account_number)
    }));

    res.json({
      user: users[0],
      accounts: maskedAccounts
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile - Update user profile
router.put('/', authenticateToken, [
  body('first_name').optional().trim(),
  body('last_name').optional().trim(),
  body('phone').optional().trim(),
  body('date_of_birth').optional().isISO8601(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, phone, date_of_birth, address } = req.body;

    // Build update query
    const updates = [];
    const params = [];

    if (first_name) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (date_of_birth) {
      updates.push('date_of_birth = ?');
      params.push(date_of_birth);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.user.id);

    await executeQuery(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/profile/password - Change password
router.put('/password', authenticateToken, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { current_password, new_password } = req.body;

    // Get current password hash
    const users = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await executeQuery(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [password_hash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/profile/security - Get security settings
router.get('/security', authenticateToken, async (req, res) => {
  try {
    const users = await executeQuery(
      `SELECT two_factor_enabled, email_verified, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      two_factor_enabled: users[0].two_factor_enabled,
      email_verified: users[0].email_verified,
      member_since: users[0].created_at
    });
  } catch (error) {
    console.error('Get security error:', error);
    res.status(500).json({ error: 'Failed to fetch security settings' });
  }
});

// GET /api/profile/sessions - Get active sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    // Get sessions from database (simulated for now since JWT is stateless)
    // In production, you'd track sessions in the sessions table
    const currentSession = {
      id: 'current',
      device: getDeviceInfo(req.headers['user-agent']),
      browser: getBrowserInfo(req.headers['user-agent']),
      ip_address: req.ip || req.connection.remoteAddress,
      location: 'Unknown', // Would use GeoIP in production
      last_active: new Date().toISOString(),
      is_current: true,
      created_at: new Date().toISOString()
    };

    // For demo, return current session + some mock historical sessions
    const sessions = [
      currentSession,
      {
        id: 'session_2',
        device: 'Windows PC',
        browser: 'Chrome 120',
        ip_address: '192.168.1.xxx',
        location: 'Lagos, Nigeria',
        last_active: new Date(Date.now() - 3600000).toISOString(),
        is_current: false,
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// DELETE /api/profile/sessions/:id - Revoke a session
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    if (sessionId === 'current') {
      return res.status(400).json({ error: 'Cannot revoke current session. Use logout instead.' });
    }

    // In production, would delete from sessions table
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// GET /api/profile/preferences - Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    // Get or create preferences
    let preferences = await executeQuery(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [req.user.id]
    );

    if (preferences.length === 0) {
      // Return defaults
      preferences = [{
        user_id: req.user.id,
        language: 'en',
        currency: 'USD',
        timezone: 'Africa/Lagos',
        date_format: 'DD/MM/YYYY',
        email_transactions: true,
        email_security: true,
        email_marketing: false,
        sms_transactions: false,
        sms_security: true,
        push_enabled: true,
        analytics_enabled: true,
        personalization_enabled: true
      }];
    }

    res.json({ preferences: preferences[0] });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// PUT /api/profile/preferences - Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const {
      language,
      currency,
      timezone,
      date_format,
      email_transactions,
      email_security,
      email_marketing,
      sms_transactions,
      sms_security,
      push_enabled,
      analytics_enabled,
      personalization_enabled
    } = req.body;

    // Check if preferences exist
    const existing = await executeQuery(
      'SELECT id FROM user_preferences WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length === 0) {
      // Create new preferences
      await executeQuery(
        `INSERT INTO user_preferences 
         (user_id, language, currency, timezone, date_format, 
          email_transactions, email_security, email_marketing,
          sms_transactions, sms_security, push_enabled,
          analytics_enabled, personalization_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [req.user.id, language || 'en', currency || 'USD', timezone || 'Africa/Lagos',
         date_format || 'DD/MM/YYYY', email_transactions ?? true, email_security ?? true,
         email_marketing ?? false, sms_transactions ?? false, sms_security ?? true,
         push_enabled ?? true, analytics_enabled ?? true, personalization_enabled ?? true]
      );
    } else {
      // Update existing preferences
      await executeQuery(
        `UPDATE user_preferences SET 
         language = COALESCE(?, language),
         currency = COALESCE(?, currency),
         timezone = COALESCE(?, timezone),
         date_format = COALESCE(?, date_format),
         email_transactions = COALESCE(?, email_transactions),
         email_security = COALESCE(?, email_security),
         email_marketing = COALESCE(?, email_marketing),
         sms_transactions = COALESCE(?, sms_transactions),
         sms_security = COALESCE(?, sms_security),
         push_enabled = COALESCE(?, push_enabled),
         analytics_enabled = COALESCE(?, analytics_enabled),
         personalization_enabled = COALESCE(?, personalization_enabled),
         updated_at = NOW()
         WHERE user_id = ?`,
        [language, currency, timezone, date_format,
         email_transactions, email_security, email_marketing,
         sms_transactions, sms_security, push_enabled,
         analytics_enabled, personalization_enabled, req.user.id]
      );
    }

    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// PUT /api/profile/notifications - Update notification preferences
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    const {
      email_transactions,
      email_security,
      email_marketing,
      sms_transactions,
      sms_security,
      push_enabled
    } = req.body;

    // Check if preferences exist
    const existing = await executeQuery(
      'SELECT id FROM user_preferences WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length === 0) {
      // Create with defaults
      await executeQuery(
        `INSERT INTO user_preferences 
         (user_id, email_transactions, email_security, email_marketing,
          sms_transactions, sms_security, push_enabled, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [req.user.id, email_transactions ?? true, email_security ?? true,
         email_marketing ?? false, sms_transactions ?? false,
         sms_security ?? true, push_enabled ?? true]
      );
    } else {
      // Update existing
      await executeQuery(
        `UPDATE user_preferences SET 
         email_transactions = COALESCE(?, email_transactions),
         email_security = COALESCE(?, email_security),
         email_marketing = COALESCE(?, email_marketing),
         sms_transactions = COALESCE(?, sms_transactions),
         sms_security = COALESCE(?, sms_security),
         push_enabled = COALESCE(?, push_enabled),
         updated_at = NOW()
         WHERE user_id = ?`,
        [email_transactions, email_security, email_marketing,
         sms_transactions, sms_security, push_enabled, req.user.id]
      );
    }

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// GET /api/profile/data - Download user data (GDPR compliance)
router.get('/data', authenticateToken, async (req, res) => {
  try {
    // Get all user data
    const users = await executeQuery(
      `SELECT id, email, first_name, last_name, phone, date_of_birth, address,
              email_verified, two_factor_enabled, created_at, updated_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    const accounts = await executeQuery(
      `SELECT id, account_number, account_type, balance, currency, status, created_at
       FROM accounts WHERE user_id = ?`,
      [req.user.id]
    );

    const transactions = await executeQuery(
      `SELECT t.id, t.amount, t.transaction_type, t.status, t.description,
              t.reference_number, t.created_at,
              a_from.account_number as from_account,
              a_to.account_number as to_account
       FROM transactions t
       LEFT JOIN accounts a_from ON t.from_account_id = a_from.id
       LEFT JOIN accounts a_to ON t.to_account_id = a_to.id
       WHERE t.from_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
          OR t.to_account_id IN (SELECT id FROM accounts WHERE user_id = ?)
       ORDER BY t.created_at DESC`,
      [req.user.id, req.user.id]
    );

    const payees = await executeQuery(
      `SELECT id, payee_name, account_number, bank_name, routing_number, created_at
       FROM payees WHERE user_id = ?`,
      [req.user.id]
    );

    const auditLogs = await executeQuery(
      `SELECT action, details, ip_address, created_at
       FROM audit_logs WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    const userData = {
      user: users[0],
      accounts: accounts,
      transactions: transactions,
      payees: payees,
      audit_logs: auditLogs,
      exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="user_data_${req.user.id}_${Date.now()}.json"`);
    res.json(userData);
  } catch (error) {
    console.error('Download data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

// DELETE /api/profile/account - Delete user account
router.delete('/account', authenticateToken, [
  body('password').notEmpty().withMessage('Password is required to delete account'),
  body('confirmation').equals('DELETE').withMessage('Please type DELETE to confirm')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;

    // Verify password
    const users = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, users[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    // Check for active accounts with balance
    const accountsWithBalance = await executeQuery(
      'SELECT id, balance FROM accounts WHERE user_id = ? AND balance > 0',
      [req.user.id]
    );

    if (accountsWithBalance.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete account. Please transfer or withdraw all funds first.',
        accounts: accountsWithBalance
      });
    }

    // Log the deletion
    await executeQuery(
      `INSERT INTO audit_logs (user_id, action, details, ip_address, created_at)
       VALUES (?, 'ACCOUNT_DELETED', 'User requested account deletion', ?, NOW())`,
      [req.user.id, req.ip || req.connection.remoteAddress]
    );

    // Delete user (cascade will handle related records)
    await executeQuery('DELETE FROM users WHERE id = ?', [req.user.id]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /api/profile/avatar - Upload avatar
router.post('/avatar', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, you'd handle file upload with multer
    // For now, we'll just update a flag
    await executeQuery(
      'UPDATE users SET updated_at = NOW() WHERE id = ?',
      [req.user.id]
    );

    res.json({ 
      message: 'Avatar uploaded successfully',
      avatar_url: `/uploads/avatars/${req.user.id}.jpg`
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Helper functions
function getDeviceInfo(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  
  return 'Unknown Device';
}

function getBrowserInfo(userAgent) {
  if (!userAgent) return 'Unknown Browser';
  
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  
  return 'Unknown Browser';
}

// Helper function to mask account number
function maskAccountNumber(accountNumber) {
  if (!accountNumber || accountNumber.length < 4) {
    return '****';
  }
  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4) + lastFour;
  return masked;
}

module.exports = router;
