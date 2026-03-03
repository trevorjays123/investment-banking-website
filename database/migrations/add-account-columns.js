/**
 * Migration: Add missing columns to accounts table
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'online_banking',
            multipleStatements: true
        });
        
        console.log('Connected to database');
        
        // Add missing columns to accounts table
        const alterStatements = [
            "ALTER TABLE accounts ADD COLUMN account_name VARCHAR(100)",
            "ALTER TABLE accounts ADD COLUMN account_type_id INT",
            "ALTER TABLE accounts ADD COLUMN available_balance DECIMAL(15,2) DEFAULT 0.00",
            "ALTER TABLE accounts ADD COLUMN margin_enabled BOOLEAN DEFAULT FALSE",
            "ALTER TABLE accounts ADD COLUMN drip_enabled BOOLEAN DEFAULT FALSE",
            "ALTER TABLE accounts ADD COLUMN fractional_shares_enabled BOOLEAN DEFAULT TRUE"
        ];
        
        for (const sql of alterStatements) {
            try {
                await connection.query(sql);
                console.log(`✅ Executed: ${sql.substring(0, 50)}...`);
            } catch (error) {
                if (error.message.includes('Duplicate column')) {
                    console.log(`⏭️ Column already exists: ${sql.substring(25, 50)}...`);
                } else {
                    console.log(`⚠️ Error: ${error.message}`);
                }
            }
        }
        
        // Update existing accounts to have account_name based on account_type
        await connection.query(`
            UPDATE accounts 
            SET account_name = CONCAT(
                CASE account_type 
                    WHEN 'checking' THEN 'Checking Account'
                    WHEN 'savings' THEN 'Savings Account'
                    WHEN 'credit' THEN 'Credit Account'
                    ELSE 'Account'
                END,
                ' #',
                SUBSTRING(account_number, -4)
            )
            WHERE account_name IS NULL OR account_name = ''
        `);
        console.log('✅ Updated account names');
        
        // Update available_balance to match balance
        await connection.query(`
            UPDATE accounts 
            SET available_balance = balance 
            WHERE available_balance IS NULL OR available_balance = 0
        `);
        console.log('✅ Updated available balances');
        
        console.log('\n🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));