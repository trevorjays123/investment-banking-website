const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { executeQuery, pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('phone').optional().trim(),
  body('date_of_birth').optional().isISO8601(),
  body('address').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, phone = null, date_of_birth = null, address = null } = req.body;

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verification_token = uuidv4();

    // Insert user
    const result = await executeQuery(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, address, verification_token, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [email, password_hash, first_name, last_name, phone, date_of_birth, address, verification_token]
    );

    // Send verification email
    console.log('📧 Sending verification email to:', email);
    const emailResult = await sendVerificationEmail(email, verification_token);
    if (!emailResult.success) {
      console.error('❌ Failed to send verification email:', emailResult.error);
      // Continue anyway - user can request a new verification email
    }

    // Create default accounts for the user
    const userId = result.insertId;

    // Create checking account
    const checkingAccountNumber = 'CHK' + Date.now() + Math.floor(Math.random() * 1000);
    await executeQuery(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status, created_at) 
       VALUES (?, ?, 'checking', 1000.00, 'USD', 'active', NOW())`,
      [userId, checkingAccountNumber]
    );

    // Create savings account
    const savingsAccountNumber = 'SAV' + Date.now() + Math.floor(Math.random() * 1000);
    await executeQuery(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status, created_at) 
       VALUES (?, ?, 'savings', 5000.00, 'USD', 'active', NOW())`,
      [userId, savingsAccountNumber]
    );

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user_id: userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login - User login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Login validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Add detailed logging at each step
    console.log('1. Login attempt for email:', email);

    // Get user by email
    const users = await executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    console.log('2. User found:', users.length > 0 ? 'Yes' : 'No');

    if (users.length === 0) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    console.log('3. User email_verified:', user.email_verified);
    console.log('4. User two_factor_enabled:', user.two_factor_enabled);
    console.log('5. Stored password hash length:', user.password_hash ? user.password_hash.length : 0);

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      console.log('✅ 2FA required for user:', email);
      // Return partial success, require 2FA code
      return res.status(200).json({
        requires_2fa: true,
        temp_token: jwt.sign({ id: user.id, temp: true }, process.env.JWT_SECRET, { expiresIn: '5m' })
      });
    }

    // Verify password
    console.log('6. Comparing passwords...');
    console.log('   Input password:', JSON.stringify(password));
    console.log('   Input password length:', password ? password.length : 0);
    console.log('   Stored hash:', user.password_hash);
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('7. Password comparison result:', isMatch ? 'Match' : 'No Match');
    
    if (!isMatch) {
      console.log('❌ Login failed: Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token (include role for admin check)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Get user accounts
    const accounts = await executeQuery(
      'SELECT id, account_number, account_type, balance, currency, status FROM accounts WHERE user_id = ?',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        role: user.role || 'user'
      },
      accounts,
      isAdmin: user.role === 'admin'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/verify-2fa - Verify 2FA code
router.post('/verify-2fa', [
  body('temp_token').notEmpty(),
  body('code').notEmpty()
], async (req, res) => {
  try {
    const { temp_token, code } = req.body;

    // Verify temp token
    const decoded = jwt.verify(temp_token, process.env.JWT_SECRET);
    if (!decoded.temp) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Get user
    const users = await executeQuery('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Verify 2FA code (in production, use a proper 2FA library like speakeasy)
    // For demo, accept any 6-digit code
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Get user accounts
    const accounts = await executeQuery(
      'SELECT id, account_number, account_type, balance, currency, status FROM accounts WHERE user_id = ?',
      [user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone
      },
      accounts
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/auth/enable-2fa - Enable 2FA
router.post('/enable-2fa', authenticateToken, async (req, res) => {
  try {
    // In production, generate a proper secret using speakeasy or similar
    const two_factor_secret = uuidv4().replace(/-/g, '').substring(0, 32);

    await executeQuery(
      'UPDATE users SET two_factor_enabled = TRUE, two_factor_secret = ? WHERE id = ?',
      [two_factor_secret, req.user.id]
    );

    res.json({
      message: '2FA enabled successfully',
      secret: two_factor_secret
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

// POST /api/auth/disable-2fa - Disable 2FA
router.post('/disable-2fa', authenticateToken, async (req, res) => {
  try {
    await executeQuery(
      'UPDATE users SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// POST /api/auth/forgot-password - Password reset request
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;
    
    // Add detailed logging
    console.log('📧 Password reset requested for:', email);

    const users = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
    console.log('📧 User exists:', users.length > 0 ? 'Yes' : 'No');

    // Always return success to prevent email enumeration
    if (users.length === 0) {
      console.log('📧 No user found - returning generic success message');
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }

    const user = users[0];
    console.log('📧 User ID:', user.id);
    console.log('📧 User email_verified:', user.email_verified);

    // Generate reset token
    const reset_token = uuidv4();
    const reset_expires = new Date(Date.now() + 3600000); // 1 hour
    console.log('📧 Reset token generated:', reset_token);
    console.log('📧 Reset expires:', reset_expires.toISOString());

    // Store reset token in database
    const updateResult = await executeQuery(
      'UPDATE users SET reset_token = ?, reset_expires = ?, updated_at = NOW() WHERE id = ?',
      [reset_token, reset_expires, user.id]
    );
    console.log('📧 Token stored in DB - affected rows:', updateResult.affectedRows);

    // Send password reset email
    console.log('📧 Attempting to send password reset email...');
    let emailSent = false;
    try {
      const emailResult = await sendPasswordResetEmail(email, reset_token);
      emailSent = emailResult.success;
      console.log('📧 Email send result:', emailSent ? 'Success' : 'Failed');
      if (!emailSent) {
        console.error('📧 Email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('📧 EMAIL FAILED:', emailError.message);
      console.error('📧 Full error:', emailError);
      // Don't throw - still return success to user
    }

    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const { token, password } = req.body;

    const users = await executeQuery(
      'SELECT * FROM users WHERE verification_token = ?',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await executeQuery(
      'UPDATE users SET password_hash = ?, verification_token = NULL, email_verified = TRUE, updated_at = NOW() WHERE id = ?',
      [password_hash, users[0].id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', authenticateToken, (req, res) => {
  // In a production app, you might want to blacklist the token
  res.json({ message: 'Logout successful' });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const users = await executeQuery(
      `SELECT id, email, first_name, last_name, phone, date_of_birth, address, 
              email_verified, two_factor_enabled, created_at 
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

module.exports = router;
