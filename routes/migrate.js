const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Auth - either valid JWT OR secret key
const requireAuth = (req, res, next) => {
  // Option 1: Secret key in header
  const secretKey = req.headers['x-secret-key'];
  if (secretKey === process.env.MIGRATION_SECRET) {
    return next();
  }
  
  // Option 2: Valid JWT token
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (error) {
      // Invalid JWT, continue to check secret key
    }
  }
  
  return res.status(401).json({ error: 'Authorization required' });
};

// GET /api/migrate/run - Run database migrations
router.get('/run', requireAuth, async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    multipleStatements: true
  });

  try {
    console.log('🔄 Running migrations...');
    const results = [];

    // 1. Add account_name to accounts table
    try {
      await connection.query(`
        ALTER TABLE accounts ADD COLUMN account_name VARCHAR(100) AFTER account_number
      `);
      results.push({ table: 'accounts', status: 'Added account_name column' });
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        results.push({ table: 'accounts', status: 'account_name column already exists' });
      } else {
        results.push({ table: 'accounts', error: err.message });
      }
    }

    // 2. Add columns to bill_payments
    const billPaymentColumns = [
      'payment_id VARCHAR(50)',
      'pay_from_account_id INT',
      'user_biller_id INT',
      'estimated_delivery_date DATE'
    ];
    
    for (const col of billPaymentColumns) {
      try {
        await connection.query(`ALTER TABLE bill_payments ADD COLUMN ${col}`);
        results.push({ table: 'bill_payments', status: `Added ${col.split(' ')[0]}` });
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          results.push({ table: 'bill_payments', error: `${col}: ${err.message}` });
        }
      }
    }

    // 3. Create documents table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          account_id INT,
          document_type VARCHAR(50) NOT NULL,
          document_name VARCHAR(255) NOT NULL,
          document_url VARCHAR(500),
          file_size INT,
          mime_type VARCHAR(100),
          document_date DATE,
          description TEXT,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          INDEX idx_user_id (user_id),
          INDEX idx_document_type (document_type),
          INDEX idx_document_date (document_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      results.push({ table: 'documents', status: 'Created table' });
    } catch (err) {
      if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
        results.push({ table: 'documents', error: err.message });
      } else {
        results.push({ table: 'documents', status: 'Table already exists' });
      }
    }

    console.log('✅ Migrations completed:', results);
    res.json({ success: true, results });
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    await connection.end();
  }
});

module.exports = router;
