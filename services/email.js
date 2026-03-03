const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Email Service for sending emails via SMTP
 * Includes detailed logging for debugging SMTP issues
 */

// Create transporter with configuration from environment variables
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Enable debug output
    logger: true,
    debug: true,
    // Connection timeout settings
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000, // 10 seconds
  };

  console.log('📧 Creating email transporter with config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? '***' + config.auth.user.slice(-10) : 'NOT SET',
    pass: config.auth.pass ? '***SET***' : 'NOT SET'
  });

  return nodemailer.createTransport(config);
};

/**
 * Verify SMTP connection
 */
const verifyConnection = async () => {
  const transporter = createTransporter();
  
  console.log('📧 Verifying SMTP connection...');
  
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', {
      error: error.message,
      code: error.code,
      command: error.command,
      hostname: error.hostname
    });
    return false;
  }
};

/**
 * Send verification email to new user
 */
const sendVerificationEmail = async (email, token) => {
  console.log('📧 Attempting to send verification email...');
  console.log('📧 Recipient:', email);
  console.log('📧 Verification token:', token);

  const transporter = createTransporter();
  
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Apex Capital'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email Address - Apex Capital',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0a192f; color: #d4a853; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 5px; }
          .button { display: inline-block; background: #d4a853; color: #0a192f; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Apex Capital</h1>
          </div>
          <div class="content">
            <h2>Welcome to Apex Capital!</h2>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0066cc;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you did not create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Apex Capital. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to Apex Capital!

Please verify your email address by visiting this link:
${verificationUrl}

This link will expire in 24 hours.

If you did not create an account, please ignore this email.

© ${new Date().getFullYear()} Apex Capital. All rights reserved.
    `
  };

  console.log('📧 Mail options prepared:', {
    from: mailOptions.from,
    to: mailOptions.to,
    subject: mailOptions.subject
  });

  try {
    console.log('📧 Sending email via SMTP...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    
    if (info.accepted && info.accepted.length > 0) {
      console.log('📧 Accepted recipients:', info.accepted);
    }
    if (info.rejected && info.rejected.length > 0) {
      console.log('📧 Rejected recipients:', info.rejected);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      hostname: error.hostname
    });
    
    // Log specific SMTP errors
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ SMTP Connection refused - Check if mail server is running');
    } else if (error.code === 'EAUTH') {
      console.error('❌ SMTP Authentication failed - Check email credentials');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ SMTP Connection timed out - Check firewall/network settings');
    } else if (error.code === 'EENVELOPE') {
      console.error('❌ SMTP Envelope error - Check sender/recipient addresses');
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, token) => {
  console.log('📧 Attempting to send password reset email...');
  console.log('📧 Recipient:', email);
  console.log('📧 Reset token:', token);

  const transporter = createTransporter();
  
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'Apex Capital'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - Apex Capital',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0a192f; color: #d4a853; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 5px; }
          .button { display: inline-block; background: #d4a853; color: #0a192f; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Apex Capital</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you did not request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Apex Capital. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Password Reset Request

We received a request to reset your password. Visit this link to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this reset, please ignore this email.

© ${new Date().getFullYear()} Apex Capital. All rights reserved.
    `
  };

  try {
    console.log('📧 Sending password reset email via SMTP...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Password reset email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', {
      error: error.message,
      code: error.code
    });
    
    return { success: false, error: error.message };
  }
};

module.exports = {
  verifyConnection,
  sendVerificationEmail,
  sendPasswordResetEmail
};
