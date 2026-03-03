const mysql = require('mysql2/promise');

async function seedAccounts() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true
  });

  try {
    await conn.query('USE online_banking');
    
    // Clear existing accounts
    await conn.query('DELETE FROM accounts');
    
    // Create accounts for users
    await conn.query(`
      INSERT INTO accounts (user_id, account_number, account_type, balance, currency, status, created_at) 
      VALUES 
        (1, 'CHK1001001', 'checking', 5000.00, 'USD', 'active', NOW()),
        (1, 'SAV1001001', 'savings', 15000.00, 'USD', 'active', NOW()),
        (2, 'CHK1002001', 'checking', 3500.00, 'USD', 'active', NOW()),
        (2, 'SAV1002001', 'savings', 8500.00, 'USD', 'active', NOW()),
        (3, 'CHK1003001', 'checking', 12000.00, 'USD', 'active', NOW()),
        (3, 'SAV1003001', 'savings', 25000.00, 'USD', 'active', NOW())
    `);
    
    const [rows] = await conn.query('SELECT * FROM accounts');
    console.log('Created accounts:', rows);
    
    console.log('\n✅ Test accounts created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await conn.end();
  }
}

seedAccounts();