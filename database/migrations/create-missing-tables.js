/**
 * Migration: Create all missing tables for the investment banking platform
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
        
        // Create user_preferences table
        await createTable(connection, 'user_preferences', `
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL UNIQUE,
                theme VARCHAR(20) DEFAULT 'light',
                currency VARCHAR(3) DEFAULT 'USD',
                language VARCHAR(5) DEFAULT 'en',
                date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
                number_format VARCHAR(20) DEFAULT '1,234.56',
                timezone VARCHAR(50) DEFAULT 'America/New_York',
                email_notifications BOOLEAN DEFAULT TRUE,
                push_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                transaction_alerts BOOLEAN DEFAULT TRUE,
                balance_alerts BOOLEAN DEFAULT TRUE,
                security_alerts BOOLEAN DEFAULT TRUE,
                marketing_emails BOOLEAN DEFAULT FALSE,
                two_factor_enabled BOOLEAN DEFAULT FALSE,
                two_factor_method VARCHAR(20) DEFAULT 'email',
                login_alerts BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create account_types table
        await createTable(connection, 'account_types', `
            CREATE TABLE IF NOT EXISTS account_types (
                id INT PRIMARY KEY AUTO_INCREMENT,
                type_name VARCHAR(50) NOT NULL UNIQUE,
                type_code VARCHAR(20) NOT NULL UNIQUE,
                category ENUM('banking', 'investment', 'retirement', 'custodial') DEFAULT 'banking',
                description TEXT,
                min_opening_balance DECIMAL(15,2) DEFAULT 0.00,
                monthly_fee DECIMAL(10,2) DEFAULT 0.00,
                interest_rate DECIMAL(5,4) DEFAULT 0.0000,
                features JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create securities table
        await createTable(connection, 'securities', `
            CREATE TABLE IF NOT EXISTS securities (
                id INT PRIMARY KEY AUTO_INCREMENT,
                symbol VARCHAR(20) NOT NULL UNIQUE,
                company_name VARCHAR(200),
                security_type ENUM('stock', 'etf', 'bond', 'mutual_fund', 'crypto', 'option') DEFAULT 'stock',
                exchange VARCHAR(20) DEFAULT 'NASDAQ',
                sector VARCHAR(50),
                industry VARCHAR(100),
                current_price DECIMAL(15,4),
                previous_close DECIMAL(15,4),
                day_change DECIMAL(15,4),
                day_change_percent DECIMAL(10,4),
                market_cap BIGINT,
                volume BIGINT,
                avg_volume BIGINT,
                pe_ratio DECIMAL(10,2),
                dividend_yield DECIMAL(5,4),
                beta DECIMAL(10,4),
                is_tradeable BOOLEAN DEFAULT TRUE,
                fractional_shares_eligible BOOLEAN DEFAULT TRUE,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create positions table
        await createTable(connection, 'positions', `
            CREATE TABLE IF NOT EXISTS positions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                account_id INT NOT NULL,
                security_id INT NOT NULL,
                quantity DECIMAL(18,6) NOT NULL DEFAULT 0,
                available_quantity DECIMAL(18,6) NOT NULL DEFAULT 0,
                average_cost DECIMAL(15,4) NOT NULL DEFAULT 0,
                total_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
                realized_gain_loss DECIMAL(18,2) DEFAULT 0,
                unrealized_gain_loss DECIMAL(18,2) DEFAULT 0,
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                UNIQUE KEY unique_position (user_id, account_id, security_id)
            )
        `);
        
        // Create orders table
        await createTable(connection, 'orders', `
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                account_id INT NOT NULL,
                security_id INT NOT NULL,
                order_id VARCHAR(50) NOT NULL UNIQUE,
                order_type ENUM('market', 'limit', 'stop', 'stop_limit') NOT NULL,
                side ENUM('buy', 'sell') NOT NULL,
                quantity DECIMAL(18,6) NOT NULL,
                filled_quantity DECIMAL(18,6) DEFAULT 0,
                price DECIMAL(15,4),
                stop_price DECIMAL(15,4),
                time_in_force ENUM('day', 'gtc', 'ioc', 'fok') DEFAULT 'day',
                status ENUM('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired') DEFAULT 'pending',
                order_value DECIMAL(18,2),
                commission DECIMAL(10,2) DEFAULT 0,
                executed_price DECIMAL(15,4),
                executed_at TIMESTAMP NULL,
                notes TEXT,
                rejection_reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        `);
        
        // Create watchlists table
        await createTable(connection, 'watchlists', `
            CREATE TABLE IF NOT EXISTS watchlists (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL DEFAULT 'My Watchlist',
                description TEXT,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create watchlist_items table
        await createTable(connection, 'watchlist_items', `
            CREATE TABLE IF NOT EXISTS watchlist_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                watchlist_id INT NOT NULL,
                security_id INT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
                UNIQUE KEY unique_watchlist_item (watchlist_id, security_id)
            )
        `);
        
        // Create billers table
        await createTable(connection, 'billers', `
            CREATE TABLE IF NOT EXISTS billers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                biller_name VARCHAR(100) NOT NULL,
                biller_code VARCHAR(50),
                category VARCHAR(50),
                account_number_format VARCHAR(50),
                logo_url VARCHAR(255),
                standard_processing_days INT DEFAULT 3,
                expedited_processing_days INT DEFAULT 1,
                standard_fee DECIMAL(10,2) DEFAULT 0,
                expedited_fee DECIMAL(10,2) DEFAULT 4.95,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create user_billers table
        await createTable(connection, 'user_billers', `
            CREATE TABLE IF NOT EXISTS user_billers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                biller_id INT NOT NULL,
                account_number_encrypted TEXT,
                account_number_masked VARCHAR(20),
                nickname VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                last_payment_date DATE,
                last_payment_amount DECIMAL(15,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_biller (user_id, biller_id)
            )
        `);
        
        // Create bill_payments table
        await createTable(connection, 'bill_payments', `
            CREATE TABLE IF NOT EXISTS bill_payments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                payment_id VARCHAR(50) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                user_biller_id INT NOT NULL,
                pay_from_account_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                memo VARCHAR(255),
                payment_date DATE NOT NULL,
                estimated_delivery_date DATE,
                processing_type ENUM('standard', 'expedited') DEFAULT 'standard',
                processing_fee DECIMAL(10,2) DEFAULT 0,
                status ENUM('scheduled', 'pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'scheduled',
                confirmation_number VARCHAR(50),
                failure_reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (pay_from_account_id) REFERENCES accounts(id)
            )
        `);
        
        // Create external_accounts table
        await createTable(connection, 'external_accounts', `
            CREATE TABLE IF NOT EXISTS external_accounts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                bank_name VARCHAR(100) NOT NULL,
                bank_logo_url VARCHAR(255),
                account_type ENUM('checking', 'savings') NOT NULL,
                account_number_encrypted TEXT NOT NULL,
                account_number_masked VARCHAR(20) NOT NULL,
                routing_number_encrypted TEXT,
                plaid_item_id VARCHAR(100),
                plaid_access_token TEXT,
                verification_status ENUM('pending', 'micro_deposits_initiated', 'verified', 'failed') DEFAULT 'pending',
                micro_deposit_amount_1 DECIMAL(10,2),
                micro_deposit_amount_2 DECIMAL(10,2),
                micro_deposit_attempts INT DEFAULT 0,
                is_primary BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                nickname VARCHAR(100),
                last_synced_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create ach_transfers table
        await createTable(connection, 'ach_transfers', `
            CREATE TABLE IF NOT EXISTS ach_transfers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                transfer_id VARCHAR(50) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                from_account_id INT,
                to_account_id INT,
                external_account_id INT,
                transfer_type ENUM('deposit', 'withdrawal') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                processing_type ENUM('standard', 'same_day', 'next_day') DEFAULT 'standard',
                processing_fee DECIMAL(10,2) DEFAULT 0,
                memo VARCHAR(255),
                status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'returned') DEFAULT 'pending',
                estimated_arrival_date DATE,
                actual_arrival_date DATE,
                failure_reason VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create wire_transfers table
        await createTable(connection, 'wire_transfers', `
            CREATE TABLE IF NOT EXISTS wire_transfers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                transfer_id VARCHAR(50) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                from_account_id INT NOT NULL,
                transfer_type ENUM('domestic', 'international') NOT NULL,
                beneficiary_name VARCHAR(200) NOT NULL,
                beneficiary_bank VARCHAR(200) NOT NULL,
                beneficiary_account VARCHAR(100) NOT NULL,
                routing_number VARCHAR(50),
                swift_code VARCHAR(20),
                iban VARCHAR(50),
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                exchange_rate DECIMAL(15,6),
                fee DECIMAL(10,2) DEFAULT 25.00,
                memo VARCHAR(255),
                status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                reference_number VARCHAR(50),
                estimated_arrival_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (from_account_id) REFERENCES accounts(id)
            )
        `);
        
        // Create internal_transfers table
        await createTable(connection, 'internal_transfers', `
            CREATE TABLE IF NOT EXISTS internal_transfers (
                id INT PRIMARY KEY AUTO_INCREMENT,
                transfer_id VARCHAR(50) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                from_account_id INT NOT NULL,
                to_account_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                memo VARCHAR(255),
                status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (from_account_id) REFERENCES accounts(id),
                FOREIGN KEY (to_account_id) REFERENCES accounts(id)
            )
        `);
        
        // Create documents table
        await createTable(connection, 'documents', `
            CREATE TABLE IF NOT EXISTS documents (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                account_id INT,
                document_type ENUM('statement', 'tax_form', 'confirmation', 'notice', 'agreement', 'other') NOT NULL,
                document_name VARCHAR(255) NOT NULL,
                document_date DATE,
                file_path VARCHAR(500),
                file_size INT,
                file_type VARCHAR(50),
                description TEXT,
                is_downloaded BOOLEAN DEFAULT FALSE,
                downloaded_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Create notifications table
        await createTable(connection, 'notifications', `
            CREATE TABLE IF NOT EXISTS notifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT,
                data JSON,
                is_read BOOLEAN DEFAULT FALSE,
                read_at TIMESTAMP,
                action_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        
        // Seed account types
        await seedAccountTypes(connection);
        
        // Seed securities
        await seedSecurities(connection);
        
        // Seed billers
        await seedBillers(connection);
        
        console.log('\n🎉 All tables created successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createTable(connection, tableName, createSql) {
    try {
        await connection.query(createSql);
        console.log(`✅ Table '${tableName}' ready`);
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log(`⏭️ Table '${tableName}' already exists`);
        } else {
            console.log(`⚠️ Error creating '${tableName}': ${error.message}`);
        }
    }
}

async function seedAccountTypes(connection) {
    const accountTypes = [
        { type_name: 'Checking Account', type_code: 'checking', category: 'banking', min_opening_balance: 25.00 },
        { type_name: 'Savings Account', type_code: 'savings', category: 'banking', min_opening_balance: 100.00, interest_rate: 0.0045 },
        { type_name: 'Premium Checking', type_code: 'premium_checking', category: 'banking', min_opening_balance: 500.00, monthly_fee: 12.00 },
        { type_name: 'High-Yield Savings', type_code: 'high_yield_savings', category: 'banking', min_opening_balance: 1000.00, interest_rate: 0.0425 },
        { type_name: 'Money Market', type_code: 'money_market', category: 'banking', min_opening_balance: 2500.00, interest_rate: 0.0350 },
        { type_name: 'Brokerage Account', type_code: 'brokerage', category: 'investment', min_opening_balance: 0.00 },
        { type_name: 'Traditional IRA', type_code: 'traditional_ira', category: 'retirement', min_opening_balance: 0.00 },
        { type_name: 'Roth IRA', type_code: 'roth_ira', category: 'retirement', min_opening_balance: 0.00 },
        { type_name: 'SEP IRA', type_code: 'sep_ira', category: 'retirement', min_opening_balance: 0.00 },
        { type_name: 'SIMPLE IRA', type_code: 'simple_ira', category: 'retirement', min_opening_balance: 0.00 },
        { type_name: '401(k) Rollover', type_code: '401k_rollover', category: 'retirement', min_opening_balance: 0.00 },
        { type_name: 'Custodial Account (UTMA)', type_code: 'utma', category: 'custodial', min_opening_balance: 0.00 },
        { type_name: 'Custodial Account (UGMA)', type_code: 'ugma', category: 'custodial', min_opening_balance: 0.00 },
        { type_name: 'Coverdell ESA', type_code: 'coverdell', category: 'custodial', min_opening_balance: 0.00 },
        { type_name: '529 College Savings', type_code: '529_plan', category: 'custodial', min_opening_balance: 25.00 }
    ];
    
    try {
        for (const type of accountTypes) {
            await connection.query(`
                INSERT IGNORE INTO account_types (type_name, type_code, category, min_opening_balance, monthly_fee, interest_rate)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [type.type_name, type.type_code, type.category, type.min_opening_balance, type.monthly_fee || 0, type.interest_rate || 0]);
        }
        console.log('✅ Account types seeded');
    } catch (error) {
        console.log('⚠️ Error seeding account types:', error.message);
    }
}

async function seedSecurities(connection) {
    const securities = [
        { symbol: 'AAPL', company_name: 'Apple Inc.', security_type: 'stock', sector: 'Technology', current_price: 178.72 },
        { symbol: 'MSFT', company_name: 'Microsoft Corporation', security_type: 'stock', sector: 'Technology', current_price: 374.58 },
        { symbol: 'GOOGL', company_name: 'Alphabet Inc.', security_type: 'stock', sector: 'Technology', current_price: 141.80 },
        { symbol: 'AMZN', company_name: 'Amazon.com Inc.', security_type: 'stock', sector: 'Consumer Cyclical', current_price: 178.25 },
        { symbol: 'TSLA', company_name: 'Tesla, Inc.', security_type: 'stock', sector: 'Consumer Cyclical', current_price: 248.50 },
        { symbol: 'NVDA', company_name: 'NVIDIA Corporation', security_type: 'stock', sector: 'Technology', current_price: 875.28 },
        { symbol: 'META', company_name: 'Meta Platforms Inc.', security_type: 'stock', sector: 'Technology', current_price: 505.95 },
        { symbol: 'JPM', company_name: 'JPMorgan Chase & Co.', security_type: 'stock', sector: 'Financial Services', current_price: 198.45 },
        { symbol: 'V', company_name: 'Visa Inc.', security_type: 'stock', sector: 'Financial Services', current_price: 279.32 },
        { symbol: 'JNJ', company_name: 'Johnson & Johnson', security_type: 'stock', sector: 'Healthcare', current_price: 156.74 },
        { symbol: 'WMT', company_name: 'Walmart Inc.', security_type: 'stock', sector: 'Consumer Defensive', current_price: 165.23 },
        { symbol: 'SPY', company_name: 'SPDR S&P 500 ETF Trust', security_type: 'etf', sector: 'Index', current_price: 507.89 },
        { symbol: 'QQQ', company_name: 'Invesco QQQ Trust', security_type: 'etf', sector: 'Index', current_price: 438.62 },
        { symbol: 'VTI', company_name: 'Vanguard Total Stock Market ETF', security_type: 'etf', sector: 'Index', current_price: 248.35 },
        { symbol: 'BTC-USD', company_name: 'Bitcoin USD', security_type: 'crypto', sector: 'Cryptocurrency', current_price: 67500.00 }
    ];
    
    try {
        for (const sec of securities) {
            await connection.query(`
                INSERT IGNORE INTO securities (symbol, company_name, security_type, sector, current_price)
                VALUES (?, ?, ?, ?, ?)
            `, [sec.symbol, sec.company_name, sec.security_type, sec.sector, sec.current_price]);
        }
        console.log('✅ Securities seeded');
    } catch (error) {
        console.log('⚠️ Error seeding securities:', error.message);
    }
}

async function seedBillers(connection) {
    const billers = [
        { biller_name: 'Electric Company', category: 'Utilities', standard_processing_days: 3 },
        { biller_name: 'Gas Company', category: 'Utilities', standard_processing_days: 3 },
        { biller_name: 'Water Department', category: 'Utilities', standard_processing_days: 5 },
        { biller_name: 'Internet Provider', category: 'Telecom', standard_processing_days: 2 },
        { biller_name: 'Cable TV', category: 'Telecom', standard_processing_days: 2 },
        { biller_name: 'Mobile Phone', category: 'Telecom', standard_processing_days: 2 },
        { biller_name: 'Auto Insurance', category: 'Insurance', standard_processing_days: 3 },
        { biller_name: 'Home Insurance', category: 'Insurance', standard_processing_days: 3 },
        { biller_name: 'Life Insurance', category: 'Insurance', standard_processing_days: 3 },
        { biller_name: 'Credit Card Payment', category: 'Credit Card', standard_processing_days: 1 },
        { biller_name: 'Mortgage', category: 'Mortgage', standard_processing_days: 3 },
        { biller_name: 'Student Loan', category: 'Loans', standard_processing_days: 3 },
        { biller_name: 'Gym Membership', category: 'Subscriptions', standard_processing_days: 2 },
        { biller_name: 'Streaming Service', category: 'Subscriptions', standard_processing_days: 1 },
        { biller_name: 'Rent Payment', category: 'Rent', standard_processing_days: 1 }
    ];
    
    try {
        for (const biller of billers) {
            await connection.query(`
                INSERT IGNORE INTO billers (biller_name, category, standard_processing_days)
                VALUES (?, ?, ?)
            `, [biller.biller_name, biller.category, biller.standard_processing_days]);
        }
        console.log('✅ Billers seeded');
    } catch (error) {
        console.log('⚠️ Error seeding billers:', error.message);
    }
}

migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));