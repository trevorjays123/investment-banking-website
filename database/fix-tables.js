const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'online_banking',
      multipleStatements: true
    });
    
    console.log('✅ Connected to database');
    
    // Create user_preferences table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL UNIQUE,
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(3) DEFAULT 'USD',
        timezone VARCHAR(50) DEFAULT 'UTC',
        date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
        theme VARCHAR(20) DEFAULT 'light',
        email_transactions BOOLEAN DEFAULT TRUE,
        email_security BOOLEAN DEFAULT TRUE,
        email_marketing BOOLEAN DEFAULT FALSE,
        email_account_alerts BOOLEAN DEFAULT TRUE,
        sms_transactions BOOLEAN DEFAULT FALSE,
        sms_security BOOLEAN DEFAULT TRUE,
        sms_alerts BOOLEAN DEFAULT FALSE,
        push_enabled BOOLEAN DEFAULT TRUE,
        analytics_enabled BOOLEAN DEFAULT TRUE,
        personalization_enabled BOOLEAN DEFAULT TRUE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ user_preferences table created');
    
    // Create billers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS billers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        biller_name VARCHAR(100) NOT NULL,
        category VARCHAR(50) DEFAULT 'other',
        account_number_format VARCHAR(50),
        payment_address TEXT,
        phone VARCHAR(20),
        website VARCHAR(255),
        logo_url VARCHAR(500),
        estimated_delivery_days INT DEFAULT 3,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ billers table created');
    
    // Create user_billers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_billers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        biller_id INT,
        custom_biller_name VARCHAR(100),
        account_number_encrypted TEXT,
        account_number_masked VARCHAR(8),
        nickname VARCHAR(50),
        category VARCHAR(50),
        is_favorite BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        auto_pay_enabled BOOLEAN DEFAULT FALSE,
        auto_pay_amount DECIMAL(15,2) DEFAULT NULL,
        auto_pay_account_id INT,
        last_payment_date DATE NULL,
        last_payment_amount DECIMAL(15,2) DEFAULT NULL,
        reminder_days_before INT DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (biller_id) REFERENCES billers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ user_billers table created');
    
    // Create securities table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS securities (
        id INT PRIMARY KEY AUTO_INCREMENT,
        symbol VARCHAR(10) NOT NULL UNIQUE,
        company_name VARCHAR(200),
        security_type VARCHAR(20) DEFAULT 'stock',
        exchange VARCHAR(20) DEFAULT 'NYSE',
        sector VARCHAR(100),
        current_price DECIMAL(15,4) DEFAULT 0.00,
        previous_close DECIMAL(15,4) DEFAULT 0.00,
        is_tradable BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ securities table created');
    
    // Create orders table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        security_id INT NOT NULL,
        order_id VARCHAR(20) UNIQUE NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        action VARCHAR(20) NOT NULL,
        quantity DECIMAL(15,6) NOT NULL,
        price_limit DECIMAL(15,4) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        filled_quantity DECIMAL(15,6) DEFAULT 0,
        average_fill_price DECIMAL(15,4) DEFAULT 0.00,
        commission DECIMAL(10,2) DEFAULT 0.00,
        fees DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (security_id) REFERENCES securities(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ orders table created');
    
    // Insert sample securities
    await connection.query(`
      INSERT IGNORE INTO securities (symbol, company_name, security_type, current_price, previous_close) VALUES
      ('AAPL', 'Apple Inc.', 'stock', 178.50, 177.80),
      ('MSFT', 'Microsoft Corporation', 'stock', 378.90, 376.50),
      ('GOOGL', 'Alphabet Inc.', 'stock', 141.80, 140.90),
      ('AMZN', 'Amazon.com Inc.', 'stock', 178.25, 177.50),
      ('TSLA', 'Tesla Inc.', 'stock', 248.50, 245.00),
      ('JPM', 'JPMorgan Chase & Co.', 'stock', 195.30, 194.20),
      ('SPY', 'SPDR S&P 500 ETF', 'etf', 456.80, 455.20)
    `);
    console.log('✅ Sample securities added');
    
    // Insert sample billers
    await connection.query(`
      INSERT IGNORE INTO billers (biller_name, category, estimated_delivery_days) VALUES
      ('Electric Company', 'utilities', 2),
      ('Gas Company', 'utilities', 2),
      ('Water Utility', 'utilities', 3),
      ('Internet Provider', 'internet', 2),
      ('Mobile Carrier', 'telecom', 2),
      ('Streaming Service', 'streaming', 1)
    `);
    console.log('✅ Sample billers added');
    
    // Insert user preferences for existing users
    await connection.query(`
      INSERT IGNORE INTO user_preferences (user_id)
      SELECT id FROM users
    `);
    console.log('✅ User preferences initialized');
    
    // Create admin_settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        setting_key VARCHAR(100) UNIQUE,
        setting_value TEXT,
        updated_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (updated_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ admin_settings table created');
    
    // Create system_alerts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        type ENUM('info', 'warning', 'critical', 'maintenance') DEFAULT 'info',
        title VARCHAR(255),
        message TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ system_alerts table created');
    
    console.log('\n✅ All missing tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixTables().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });