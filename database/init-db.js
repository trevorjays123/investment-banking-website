const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  let connection;
  
  try {
    // Connect to MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS online_banking');
    await connection.query('USE online_banking');
    console.log('✅ Database ready');
    
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        date_of_birth DATE,
        address TEXT,
        role ENUM('user', 'admin') DEFAULT 'user',
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Users table created');
    
    // Create accounts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        account_number VARCHAR(20) UNIQUE NOT NULL,
        account_type VARCHAR(10) NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0.00,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('active', 'frozen', 'closed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_account_number (account_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Accounts table created');
    
    // Create transactions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        from_account_id INT,
        to_account_id INT,
        amount DECIMAL(15,2) NOT NULL,
        transaction_type ENUM('transfer', 'deposit', 'withdrawal', 'payment') NOT NULL,
        status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',
        description TEXT,
        reference_number VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
        INDEX idx_from_account (from_account_id),
        INDEX idx_to_account (to_account_id),
        INDEX idx_reference (reference_number),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Transactions table created');
    
    // Create payees table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        payee_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(20) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        routing_number VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Payees table created');
    
    // Create bill_payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bill_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        payee_id INT NOT NULL,
        from_account_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        status ENUM('scheduled', 'paid', 'failed') DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE CASCADE,
        FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Bill payments table created');
    
    // Create audit_logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Audit logs table created');
    
    // Create sessions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent VARCHAR(255),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Sessions table created');
    
    // Insert test user - First delete existing to ensure fresh hash
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    
    // Delete existing test user first
    await connection.query('DELETE FROM users WHERE email = ?', ['john.doe@example.com']);
    
    await connection.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
      VALUES ('john.doe@example.com', ?, 'John', 'Doe', 'user', TRUE)
    `, [passwordHash]);
    console.log('✅ Test user created (email: john.doe@example.com, password: password123)');
    console.log('  Password hash:', passwordHash.substring(0, 20) + '...');
    
    // Get user ID
    const [users] = await connection.query('SELECT id FROM users WHERE email = ?', ['john.doe@example.com']);
    const userId = users[0].id;
    
    // Create test accounts
    await connection.query(`
      INSERT IGNORE INTO accounts (user_id, account_number, account_type, balance, status)
      VALUES 
        (?, '1000000001', 'checking', 5000.00, 'active'),
        (?, '1000000002', 'savings', 10000.00, 'active')
    `, [userId, userId]);
    console.log('✅ Test accounts created');
    
    console.log('\n✅ Database initialization complete!');
    console.log('\nTest credentials:');
    console.log('  Email: john.doe@example.com');
    console.log('  Password: password123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });