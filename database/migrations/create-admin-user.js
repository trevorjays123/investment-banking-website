/**
 * Create Admin User
 * Run this to create an admin user for the dashboard
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdminUser() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'online_banking'
    });

    console.log('✅ Connected to database');

    // Admin user details
    const adminEmail = 'admin@apexcapital.com';
    const adminPassword = 'Admin@123'; // Change this!
    const firstName = 'Admin';
    const lastName = 'User';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // Check if admin already exists
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existing.length > 0) {
      // Update existing user to admin
      await connection.query(
        'UPDATE users SET role = ? WHERE email = ?',
        ['admin', adminEmail]
      );
      console.log('✅ Updated existing user to admin');
    } else {
      // Insert new admin user
      await connection.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified, created_at)
         VALUES (?, ?, ?, ?, 'admin', TRUE, NOW())`,
        [firstName, lastName, adminEmail, passwordHash]
      );
      console.log('✅ Created new admin user');
    }

    console.log('\n📋 Admin Login Details:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  Change the password after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdminUser()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

