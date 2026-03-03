const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSeed() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'online_banking',
      multipleStatements: true
    });

    console.log('Connected to database');

    // Read and execute seed.sql
    const seedFilePath = path.join(__dirname, 'seed.sql');
    const seedSQL = fs.readFileSync(seedFilePath, 'utf8');

    console.log('Running seed.sql...');
    await connection.query(seedSQL);
    
    console.log('Seed data inserted successfully!');

    // Verify data was inserted
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`Total users: ${users[0].count}`);

    const [accounts] = await connection.query('SELECT COUNT(*) as count FROM accounts');
    console.log(`Total accounts: ${accounts[0].count}`);

  } catch (error) {
    console.error('Error running seed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

runSeed();
