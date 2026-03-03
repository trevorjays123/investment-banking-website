const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to MySQL server without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('✅ Connected to MySQL server');
    
    // Create database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS online_banking');
    console.log('✅ Database created or already exists');
    
    // Use the database
    await connection.query('USE online_banking');
    
    // Read and execute setup.sql
    const sqlFile = path.join(__dirname, 'setup.sql');
    
    if (fs.existsSync(sqlFile)) {
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      
      // Split by semicolon and execute each statement
      // Handle DELIMITER statements separately
      const statements = sqlContent.split(/;\s*$/m).filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim() && !statement.trim().startsWith('--')) {
          try {
            await connection.query(statement);
          } catch (err) {
            // Skip certain errors that are expected (like IF EXISTS)
            if (!err.message.includes('already exists') && 
                !err.message.includes('Duplicate') &&
                !err.message.includes('DELIMITER')) {
              console.error('Error executing statement:', err.message);
            }
          }
        }
      }
      
      console.log('✅ Tables created successfully!');
      
      // Execute seed data if exists
      const seedFile = path.join(__dirname, 'seed.sql');
      if (fs.existsSync(seedFile)) {
        const seedContent = fs.readFileSync(seedFile, 'utf8');
        const seedStatements = seedContent.split(/;\s*$/m).filter(stmt => stmt.trim());
        
        for (const statement of seedStatements) {
          if (statement.trim() && !statement.trim().startsWith('--')) {
            try {
              await connection.query(statement);
            } catch (err) {
              // Skip duplicate entry errors for seed data
              if (!err.message.includes('Duplicate')) {
                console.error('Error executing seed statement:', err.message);
              }
            }
          }
        }
        
        console.log('✅ Sample data loaded!');
      }
    } else {
      console.error('❌ setup.sql file not found');
    }
    
    console.log('\n✅ Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
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
