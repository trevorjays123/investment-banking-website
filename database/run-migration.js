const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'online_banking',
    port: parseInt(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  try {
    console.log('🔄 Running migration to fix missing columns...');
    
    // 1. Add account_name to accounts table
    try {
      await connection.query(`
        ALTER TABLE accounts ADD COLUMN account_name VARCHAR(100) AFTER account_number
      `);
      console.log('✅ Added account_name column to accounts');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  account_name column already exists');
      } else {
        console.error('❌ Error adding account_name:', err.message);
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
        console.log(`✅ Added ${col.split(' ')[0]} to bill_payments`);
      } catch (err) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.log(`ℹ️  ${col.split(' ')[0]}: ${err.message}`);
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
      console.log('✅ Created documents table');
    } catch (err) {
      if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error('❌ Error creating documents table:', err.message);
      } else {
        console.log('ℹ️  documents table already exists');
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

runMigration();
