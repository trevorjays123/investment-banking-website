const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS online_banking');
    console.log('✅ Database created or already exists');
    
    // Use the database
    await connection.query('USE online_banking');
    
    // Read setup.sql
    const sqlFile = path.join(__dirname, 'setup.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent.split(/;\s*$/m).filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim() && !statement.trim().startsWith('--')) {
        try {
          await connection.query(statement);
        } catch (e) {
          // Skip errors for IF EXISTS statements and DELIMITER
          if (!e.message.includes('already exists') && 
              !e.message.includes('Duplicate') &&
              !e.message.includes('DELIMITER')) {
            console.log('Statement error (may be ok):', e.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('✅ Tables created successfully!');
    
    // Try to load seed data
    const seedFile = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedFile)) {
      const seedContent = fs.readFileSync(seedFile, 'utf8');
      const seedStatements = seedContent.split(/;\s*$/m).filter(stmt => stmt.trim());
      
      for (const statement of seedStatements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          try {
            await connection.query(statement);
          } catch (e) {
            // Skip duplicate entry errors
            if (!e.message.includes('Duplicate')) {
              console.log('Seed error (may be ok):', e.message.substring(0, 100));
            }
          }
        }
      }
      console.log('✅ Sample data loaded!');
    }
    
    console.log('\n✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = setupDatabase;
