const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function debugPassword() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'online_banking'
    });
    
    console.log('Connected to database');
    
    // Get the stored user
    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', ['john.doe@example.com']);
    
    if (users.length === 0) {
      console.log('User not found!');
      return;
    }
    
    const user = users[0];
    console.log('\n=== User from database ===');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Password hash:', user.password_hash);
    console.log('Hash length:', user.password_hash ? user.password_hash.length : 0);
    console.log('Hash type:', typeof user.password_hash);
    
    // Test password comparison
    const testPassword = 'password123';
    console.log('\n=== Testing password comparison ===');
    console.log('Test password:', testPassword);
    
    const isMatch = await bcrypt.compare(testPassword, user.password_hash);
    console.log('Password match:', isMatch);
    
    // Create a new hash and compare
    console.log('\n=== Creating new hash ===');
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(testPassword, salt);
    console.log('New hash:', newHash);
    console.log('New hash length:', newHash.length);
    
    const newMatch = await bcrypt.compare(testPassword, newHash);
    console.log('New hash match:', newMatch);
    
    // Update the user with new hash
    console.log('\n=== Updating user with new hash ===');
    await connection.query('UPDATE users SET password_hash = ? WHERE email = ?', [newHash, 'john.doe@example.com']);
    console.log('User updated!');
    
    // Verify the update
    const [updatedUsers] = await connection.query('SELECT password_hash FROM users WHERE email = ?', ['john.doe@example.com']);
    console.log('Stored hash after update:', updatedUsers[0].password_hash);
    
    const finalMatch = await bcrypt.compare(testPassword, updatedUsers[0].password_hash);
    console.log('Final password match:', finalMatch);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

debugPassword();