/**
 * Simplified Admin Tables Migration
 * Creates only the missing admin tables
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupAdminTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'online_banking',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // Create system_alerts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
        title VARCHAR(200) NOT NULL,
        message TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active (is_active),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created system_alerts table');

    // Create audit_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id INT,
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_target (target_type, target_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created audit_logs table');

    // Create investments table (if not exists)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS investments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        account_id INT,
        investment_type ENUM('stocks', 'bonds', 'mutual_funds', 'fixed_deposit', 'real_estate', 'crypto') DEFAULT 'stocks',
        amount DECIMAL(15,2) NOT NULL,
        expected_return DECIMAL(5,2) DEFAULT 0.00,
        actual_return DECIMAL(5,2) DEFAULT NULL,
        status ENUM('active', 'matured', 'cancelled', 'pending') DEFAULT 'pending',
        start_date DATE NOT NULL,
        maturity_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_investment_type (investment_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created investments table');

    // Create daily_revenue table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_revenue (
        id INT PRIMARY KEY AUTO_INCREMENT,
        date DATE NOT NULL UNIQUE,
        transaction_fees DECIMAL(15,2) DEFAULT 0.00,
        investment_fees DECIMAL(15,2) DEFAULT 0.00,
        service_charges DECIMAL(15,2) DEFAULT 0.00,
        interest_income DECIMAL(15,2) DEFAULT 0.00,
        total_revenue DECIMAL(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Created daily_revenue table');

    // Insert sample revenue data
    await connection.query(`
      INSERT IGNORE INTO daily_revenue (date, transaction_fees, investment_fees, service_charges, interest_income, total_revenue)
      SELECT 
        DATE_SUB(CURDATE(), INTERVAL n DAY) as date,
        ROUND(100 + RAND() * 500, 2) as transaction_fees,
        ROUND(50 + RAND() * 300, 2) as investment_fees,
        ROUND(25 + RAND() * 150, 2) as service_charges,
        ROUND(200 + RAND() * 800, 2) as interest_income,
        ROUND(375 + RAND() * 1750, 2) as total_revenue
      FROM (
        SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
        SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
        SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION
        SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
        SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION
        SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
      ) as days
    `);
    console.log('✅ Inserted sample revenue data');

    console.log('\n🎉 Admin tables setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupAdminTables()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

