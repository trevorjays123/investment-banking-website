/**
 * Script to run the complete database schema
 * Usage: node database/run-schema.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSchema() {
    let connection;
    
    try {
        // Connect to MySQL server (without database selected)
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });
        
        console.log('✅ Connected to MySQL server');
        
        // Create database if it doesn't exist
        const dbName = process.env.DB_NAME || 'online_banking';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);
        console.log(`✅ Using database: ${dbName}`);
        
        // Read and execute the schema file with multipleStatements enabled
        const schemaPath = path.join(__dirname, 'schema-complete.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('⏳ Executing database schema...');
        
        // Execute the entire schema at once (multipleStatements: true)
        await connection.query(schema);
        
        console.log(`\n✅ Schema execution completed!`);
        
        // Verify tables were created
        const [tables] = await connection.query('SHOW TABLES');
        console.log(`\n📊 Tables in database (${tables.length}):`);
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });
        
        console.log('\n🎉 Database setup complete!');
        
    } catch (error) {
        console.error('❌ Schema execution failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the schema
runSchema()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
