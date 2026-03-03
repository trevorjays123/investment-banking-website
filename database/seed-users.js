const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function seedUsers() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    multipleStatements: true
  });

  try {
    await conn.query('USE online_banking');
    
    // Generate password hash
    const hash = await bcrypt.hash('password', 10);
    console.log('Generated hash:', hash);
    
    // Clear existing users
    await conn.query('DELETE FROM users');
    
    // Insert test users
    await conn.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, date_of_birth, address, role, email_verified, two_factor_enabled, created_at) 
      VALUES 
        (1, 'john.doe@example.com', ?, 'John', 'Doe', '555-0101', '1985-05-15', '123 Main Street, New York, NY 10001', 'user', TRUE, FALSE, NOW()),
        (2, 'jane.smith@example.com', ?, 'Jane', 'Smith', '555-0102', '1990-08-22', '456 Oak Avenue, Los Angeles, CA 90001', 'user', TRUE, FALSE, NOW()),
        (3, 'bob.wilson@example.com', ?, 'Bob', 'Wilson', '555-0103', '1978-12-01', '789 Pine Road, Chicago, IL 60601', 'user', TRUE, TRUE, NOW())
    `, [hash, hash, hash]);
    
    const [rows] = await conn.query('SELECT id, email, email_verified FROM users');
    console.log('Created users:', rows);
    
    console.log('\n✅ Test users created successfully!');
    console.log('Password for all users: password');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await conn.end();
  }
}

seedUsers();