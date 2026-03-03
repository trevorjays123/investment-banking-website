-- ============================================
-- COMPLETE INVESTMENT BANKING DATABASE SCHEMA
-- ============================================
-- Run this script to create all necessary tables

-- Drop existing tables if they exist (be careful in production!)
-- Uncomment the following lines if you want a fresh start:
-- DROP TABLE IF EXISTS check_deposits;
-- DROP TABLE IF EXISTS dividends;
-- DROP TABLE IF EXISTS watchlist_items;
-- DROP TABLE IF EXISTS watchlists;
-- DROP TABLE IF EXISTS bill_payments;
-- DROP TABLE IF EXISTS user_billers;
-- DROP TABLE IF EXISTS billers;
-- DROP TABLE IF EXISTS transfer_templates;
-- DROP TABLE IF EXISTS external_accounts;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS positions;
-- DROP TABLE IF EXISTS securities;
-- DROP TABLE IF EXISTS beneficiaries;
-- DROP TABLE IF EXISTS investment_goals;
-- DROP TABLE IF EXISTS documents;
-- DROP TABLE IF EXISTS user_activity_log;
-- DROP TABLE IF EXISTS account_types;
-- DROP TABLE IF EXISTS user_preferences;

-- ============================================
-- ACCOUNT TYPES
-- ============================================
CREATE TABLE IF NOT EXISTS account_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_code VARCHAR(30) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    category ENUM('banking', 'investment', 'retirement', 'custodial') DEFAULT 'banking',
    minimum_balance DECIMAL(15,2) DEFAULT 0.00,
    monthly_fee DECIMAL(10,2) DEFAULT 0.00,
    interest_rate DECIMAL(5,4) DEFAULT 0.0000,
    is_tax_advantaged BOOLEAN DEFAULT FALSE,
    tax_advantage_type ENUM('traditional', 'roth', 'sep', 'simple', 'coverdell') NULL,
    margin_eligible BOOLEAN DEFAULT FALSE,
    options_eligible BOOLEAN DEFAULT FALSE,
    trading_allowed BOOLEAN DEFAULT FALSE,
    fractional_shares_eligible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default account types
INSERT IGNORE INTO account_types (type_code, type_name, description, category, minimum_balance, trading_allowed, margin_eligible) VALUES
('checking', 'Checking Account', 'Basic checking account for everyday transactions', 'banking', 0.00, FALSE, FALSE),
('savings', 'Savings Account', 'Interest-bearing savings account', 'banking', 100.00, FALSE, FALSE),
('money_market', 'Money Market Account', 'Higher yield account with check-writing privileges', 'banking', 2500.00, FALSE, FALSE),
('individual_brokerage', 'Individual Brokerage', 'Standard taxable brokerage account', 'investment', 0.00, TRUE, TRUE),
('joint_brokerage', 'Joint Brokerage', 'Brokerage account with joint ownership', 'investment', 0.00, TRUE, TRUE),
('traditional_ira', 'Traditional IRA', 'Tax-deferred retirement account', 'retirement', 0.00, TRUE, FALSE),
('roth_ira', 'Roth IRA', 'After-tax retirement account with tax-free growth', 'retirement', 0.00, TRUE, FALSE),
('rollover_ira', 'Rollover IRA', 'IRA for rollovers from 401(k) or other retirement plans', 'retirement', 0.00, TRUE, FALSE),
('sep_ira', 'SEP IRA', 'Simplified Employee Pension IRA for self-employed', 'retirement', 0.00, TRUE, FALSE),
('simple_ira', 'SIMPLE IRA', 'Savings Incentive Match Plan for employees', 'retirement', 0.00, TRUE, FALSE),
('custodial', 'Custodial Account (UTMA/UGMA)', 'Account for minors with adult custodian', 'custodial', 0.00, TRUE, FALSE),
('trust', 'Trust Account', 'Account held in trust', 'investment', 0.00, TRUE, TRUE),
('corporate', 'Corporate Account', 'Brokerage account for corporations', 'investment', 10000.00, TRUE, TRUE),
('partnership', 'Partnership Account', 'Brokerage account for partnerships', 'investment', 10000.00, TRUE, TRUE),
('margin', 'Margin Account', 'Account with margin trading capability', 'investment', 2000.00, TRUE, TRUE);

-- ============================================
-- USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    
    -- Display preferences
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    theme VARCHAR(20) DEFAULT 'light',
    
    -- Email notification preferences
    email_transactions BOOLEAN DEFAULT TRUE,
    email_security BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,
    email_account_alerts BOOLEAN DEFAULT TRUE,
    
    -- SMS notification preferences
    sms_transactions BOOLEAN DEFAULT FALSE,
    sms_security BOOLEAN DEFAULT TRUE,
    sms_alerts BOOLEAN DEFAULT FALSE,
    
    -- Push notification preferences
    push_enabled BOOLEAN DEFAULT TRUE,
    
    -- Privacy preferences
    analytics_enabled BOOLEAN DEFAULT TRUE,
    personalization_enabled BOOLEAN DEFAULT TRUE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SECURITIES (Stock, ETF, Bonds, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS securities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    company_name VARCHAR(200),
    security_type ENUM('stock', 'etf', 'mutual_fund', 'bond', 'option', 'crypto') DEFAULT 'stock',
    exchange VARCHAR(20) DEFAULT 'NYSE',
    sector VARCHAR(100),
    industry VARCHAR(100),
    description TEXT,
    logo_url VARCHAR(500),
    current_price DECIMAL(15,4) DEFAULT 0.00,
    previous_close DECIMAL(15,4) DEFAULT 0.00,
    day_high DECIMAL(15,4) DEFAULT 0.00,
    day_low DECIMAL(15,4) DEFAULT 0.00,
    year_high DECIMAL(15,4) DEFAULT 0.00,
    year_low DECIMAL(15,4) DEFAULT 0.00,
    market_cap BIGINT DEFAULT 0,
    pe_ratio DECIMAL(10,2) DEFAULT NULL,
    dividend_yield DECIMAL(5,4) DEFAULT 0.0000,
    beta DECIMAL(8,4) DEFAULT NULL,
    volume BIGINT DEFAULT 0,
    avg_volume BIGINT DEFAULT 0,
    is_fractional_eligible BOOLEAN DEFAULT TRUE,
    is_tradable BOOLEAN DEFAULT TRUE,
    margin_requirement DECIMAL(5,2) DEFAULT 50.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_type (security_type),
    INDEX idx_sector (sector)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample securities
INSERT IGNORE INTO securities (symbol, company_name, security_type, exchange, sector, current_price, previous_close, dividend_yield) VALUES
('AAPL', 'Apple Inc.', 'stock', 'NASDAQ', 'Technology', 178.50, 177.80, 0.0051),
('MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', 'Technology', 378.90, 376.50, 0.0072),
('GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', 'Technology', 141.80, 140.90, 0.0000),
('AMZN', 'Amazon.com Inc.', 'stock', 'NASDAQ', 'Consumer Cyclical', 178.25, 177.50, 0.0000),
('TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', 'Consumer Cyclical', 248.50, 245.00, 0.0000),
('JPM', 'JPMorgan Chase & Co.', 'stock', 'NYSE', 'Financial Services', 195.30, 194.20, 0.0235),
('V', 'Visa Inc.', 'stock', 'NYSE', 'Financial Services', 279.80, 278.50, 0.0075),
('JNJ', 'Johnson & Johnson', 'stock', 'NYSE', 'Healthcare', 156.40, 155.90, 0.0296),
('WMT', 'Walmart Inc.', 'stock', 'NYSE', 'Consumer Defensive', 165.20, 164.80, 0.0142),
('PG', 'Procter & Gamble Company', 'stock', 'NYSE', 'Consumer Defensive', 158.90, 158.20, 0.0241),
('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE', 'N/A', 456.80, 455.20, 0.0148),
('QQQ', 'Invesco QQQ Trust', 'etf', 'NASDAQ', 'N/A', 389.50, 387.80, 0.0052),
('VTI', 'Vanguard Total Stock Market ETF', 'etf', 'NYSE', 'N/A', 234.60, 233.90, 0.0156),
('BTC', 'Bitcoin', 'crypto', 'CRYPTO', 'Cryptocurrency', 43500.00, 43200.00, 0.0000),
('ETH', 'Ethereum', 'crypto', 'CRYPTO', 'Cryptocurrency', 2280.00, 2250.00, 0.0000);

-- ============================================
-- EXTERNAL ACCOUNTS (Linked Bank Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS external_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    institution_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(100),
    account_type ENUM('checking', 'savings', 'investment') DEFAULT 'checking',
    account_number_masked VARCHAR(8),
    account_number_encrypted TEXT,
    routing_number VARCHAR(20),
    balance DECIMAL(15,2) DEFAULT NULL,
    verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending',
    verification_method ENUM('micro_deposits', 'instant', 'plaid') DEFAULT 'micro_deposits',
    micro_deposit_1 DECIMAL(5,2) DEFAULT NULL,
    micro_deposit_2 DECIMAL(5,2) DEFAULT NULL,
    micro_deposits_sent_at TIMESTAMP NULL,
    verification_attempts INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    nickname VARCHAR(50),
    verified_at TIMESTAMP NULL,
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_verification_status (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- TRANSFER TEMPLATES (Recurring Transfers)
-- ============================================
CREATE TABLE IF NOT EXISTS transfer_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    from_account_id INT,
    from_external_id INT,
    to_account_id INT,
    to_external_id INT,
    amount DECIMAL(15,2) NOT NULL,
    transfer_type ENUM('ach', 'wire', 'internal') DEFAULT 'ach',
    ach_type ENUM('standard', 'same_day') DEFAULT 'standard',
    frequency ENUM('once', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually') DEFAULT 'once',
    next_date DATE,
    end_date DATE NULL,
    status ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active',
    last_run_date DATE NULL,
    runs_count INT DEFAULT 0,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_next_date (next_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BILLERS (Pre-defined Bill Payees)
-- ============================================
CREATE TABLE IF NOT EXISTS billers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    biller_name VARCHAR(100) NOT NULL,
    category ENUM('utilities', 'credit_card', 'mortgage', 'rent', 'insurance', 'telecom', 'internet', 'streaming', 'other') DEFAULT 'other',
    account_number_format VARCHAR(50),
    payment_address TEXT,
    phone VARCHAR(20),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    estimated_delivery_days INT DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (biller_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample billers
INSERT IGNORE INTO billers (biller_name, category, estimated_delivery_days) VALUES
('Electric Company', 'utilities', 2),
('Gas Company', 'utilities', 2),
('Water Utility', 'utilities', 3),
('City Services', 'utilities', 3),
('Internet Provider', 'internet', 2),
('Mobile Carrier', 'telecom', 2),
('Cable TV', 'telecom', 2),
('Streaming Service', 'streaming', 1),
('Credit Card', 'credit_card', 2),
('Auto Insurance', 'insurance', 3),
('Home Insurance', 'insurance', 3),
('Life Insurance', 'insurance', 3);

-- ============================================
-- USER BILLERS (User's Saved Billers)
-- ============================================
CREATE TABLE IF NOT EXISTS user_billers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    biller_id INT,
    custom_biller_name VARCHAR(100),
    account_number_encrypted TEXT,
    account_number_masked VARCHAR(8),
    nickname VARCHAR(50),
    category VARCHAR(50),
    is_favorite BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    auto_pay_amount DECIMAL(15,2) DEFAULT NULL,
    auto_pay_account_id INT,
    last_payment_date DATE NULL,
    last_payment_amount DECIMAL(15,2) DEFAULT NULL,
    reminder_days_before INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (biller_id) REFERENCES billers(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_biller_id (biller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BILL PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS bill_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_biller_id INT,
    payment_id VARCHAR(20) UNIQUE NOT NULL,
    pay_from_account_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    estimated_delivery_date DATE,
    actual_delivery_date DATE NULL,
    status ENUM('scheduled', 'pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'scheduled',
    confirmation_number VARCHAR(50) NULL,
    memo VARCHAR(255),
    category VARCHAR(50),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_template_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_biller_id) REFERENCES user_billers(id) ON DELETE SET NULL,
    FOREIGN KEY (pay_from_account_id) REFERENCES accounts(id),
    INDEX idx_user_id (user_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (status),
    INDEX idx_payment_id (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- POSITIONS (Current Holdings)
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
    available_quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
    cost_basis DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    average_cost DECIMAL(15,4) NOT NULL DEFAULT 0.00,
    current_price DECIMAL(15,4) DEFAULT 0.00,
    market_value DECIMAL(15,2) DEFAULT 0.00,
    unrealized_gain_loss DECIMAL(15,2) DEFAULT 0.00,
    unrealized_gain_loss_percent DECIMAL(8,4) DEFAULT 0.00,
    day_change DECIMAL(15,2) DEFAULT 0.00,
    day_change_percent DECIMAL(8,4) DEFAULT 0.00,
    dividend_reinvest BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    UNIQUE KEY uk_account_security (account_id, security_id),
    INDEX idx_account_id (account_id),
    INDEX idx_security_id (security_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ORDERS (Trade Orders)
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    order_id VARCHAR(20) UNIQUE NOT NULL,
    order_type ENUM('market', 'limit', 'stop', 'stop_limit', 'trailing_stop') NOT NULL,
    action ENUM('buy', 'sell', 'buy_to_cover', 'sell_short') NOT NULL,
    quantity DECIMAL(15,6) NOT NULL,
    requested_quantity DECIMAL(15,6) NOT NULL,
    price_limit DECIMAL(15,4) DEFAULT NULL,
    stop_price DECIMAL(15,4) DEFAULT NULL,
    trail_amount DECIMAL(15,4) DEFAULT NULL,
    trail_percent DECIMAL(5,2) DEFAULT NULL,
    time_in_force ENUM('day', 'gtc', 'ioc', 'fok') DEFAULT 'day',
    status ENUM('pending', 'open', 'filled', 'partially_filled', 'cancelled', 'rejected', 'expired') DEFAULT 'pending',
    filled_quantity DECIMAL(15,6) DEFAULT 0,
    average_fill_price DECIMAL(15,4) DEFAULT 0.00,
    estimated_total DECIMAL(15,2) DEFAULT 0.00,
    actual_total DECIMAL(15,2) DEFAULT 0.00,
    commission DECIMAL(10,2) DEFAULT 0.00,
    fees DECIMAL(10,2) DEFAULT 0.00,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_account_id (account_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status),
    INDEX idx_requested_at (requested_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WATCHLISTS
-- ============================================
CREATE TABLE IF NOT EXISTS watchlists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL DEFAULT 'Watchlist',
    description VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WATCHLIST ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS watchlist_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    watchlist_id INT NOT NULL,
    security_id INT NOT NULL,
    notes TEXT,
    target_price DECIMAL(15,4) DEFAULT NULL,
    alert_above DECIMAL(15,4) DEFAULT NULL,
    alert_below DECIMAL(15,4) DEFAULT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    UNIQUE KEY uk_watchlist_security (watchlist_id, security_id),
    INDEX idx_watchlist_id (watchlist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CHECK DEPOSITS
-- ============================================
CREATE TABLE IF NOT EXISTS check_deposits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    deposit_id VARCHAR(20) UNIQUE NOT NULL,
    check_number VARCHAR(20),
    amount DECIMAL(15,2) NOT NULL,
    front_image_path VARCHAR(255),
    back_image_path VARCHAR(255),
    front_image_data LONGBLOB,
    back_image_data LONGBLOB,
    status ENUM('pending', 'processing', 'approved', 'cleared', 'returned', 'cancelled') DEFAULT 'pending',
    hold_until DATE NULL,
    provisional_credit DECIMAL(15,2) DEFAULT 0.00,
    rejection_reason TEXT NULL,
    ocr_confidence_score DECIMAL(5,2) DEFAULT NULL,
    deposited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    cleared_at TIMESTAMP NULL,
    returned_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    INDEX idx_user_id (user_id),
    INDEX idx_deposit_id (deposit_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DIVIDENDS
-- ============================================
CREATE TABLE IF NOT EXISTS dividends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    position_id INT,
    amount DECIMAL(15,2) NOT NULL,
    shares_eligible DECIMAL(15,6),
    dividend_per_share DECIMAL(15,4),
    ex_date DATE NOT NULL,
    record_date DATE,
    payment_date DATE,
    reinvested BOOLEAN DEFAULT FALSE,
    shares_purchased DECIMAL(15,6) DEFAULT 0,
    purchase_price DECIMAL(15,4) DEFAULT NULL,
    status ENUM('pending', 'processed', 'reinvested') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
    INDEX idx_account_id (account_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BENEFICIARIES
-- ============================================
CREATE TABLE IF NOT EXISTS beneficiaries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    beneficiary_type ENUM('primary', 'contingent') DEFAULT 'primary',
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    relationship VARCHAR(50),
    percentage DECIMAL(5,2) DEFAULT 100.00,
    ssn_encrypted VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    phone VARCHAR(20),
    email VARCHAR(100),
    is_trust BOOLEAN DEFAULT FALSE,
    trust_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INVESTMENT GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS investment_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    goal_name VARCHAR(100) NOT NULL,
    goal_type ENUM('retirement', 'education', 'home', 'emergency_fund', 'vacation', 'wedding', 'car', 'other') DEFAULT 'other',
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    monthly_contribution DECIMAL(15,2) DEFAULT 0.00,
    target_date DATE,
    risk_tolerance ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
    status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active',
    progress_percent DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    document_type ENUM('statement', 'tax_form', 'confirmation', 'agreement', 'id_verification', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_data LONGBLOB,
    file_size INT,
    mime_type VARCHAR(100),
    period_start DATE,
    period_end DATE,
    status ENUM('pending', 'available', 'archived', 'deleted') DEFAULT 'available',
    is_viewed BOOLEAN DEFAULT FALSE,
    is_downloaded BOOLEAN DEFAULT FALSE,
    downloaded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_document_type (document_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- USER ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- WIRE TRANSFERS
-- ============================================
CREATE TABLE IF NOT EXISTS wire_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    from_account_id INT NOT NULL,
    transfer_id VARCHAR(20) UNIQUE NOT NULL,
    wire_type ENUM('domestic', 'international') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(15,6) DEFAULT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    recipient_name VARCHAR(200) NOT NULL,
    recipient_bank_name VARCHAR(200) NOT NULL,
    recipient_bank_address TEXT,
    recipient_account_number_encrypted TEXT,
    recipient_account_number_masked VARCHAR(8),
    routing_number VARCHAR(20),
    swift_code VARCHAR(11),
    iban VARCHAR(34),
    intermediary_bank VARCHAR(200),
    intermediary_swift VARCHAR(11),
    reference_number VARCHAR(50),
    purpose VARCHAR(255),
    status ENUM('pending', 'submitted', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id),
    INDEX idx_user_id (user_id),
    INDEX idx_transfer_id (transfer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ACH TRANSFERS
-- ============================================
CREATE TABLE IF NOT EXISTS ach_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    from_account_id INT,
    from_external_id INT,
    to_account_id INT,
    to_external_id INT,
    transfer_id VARCHAR(20) UNIQUE NOT NULL,
    ach_type ENUM('standard', 'same_day') DEFAULT 'standard',
    amount DECIMAL(15,2) NOT NULL,
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    description VARCHAR(255),
    status ENUM('pending', 'submitted', 'processing', 'completed', 'failed', 'cancelled', 'returned') DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_arrival DATE,
    completed_at TIMESTAMP NULL,
    returned_at TIMESTAMP NULL,
    return_reason VARCHAR(255),
    trace_number VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_transfer_id (transfer_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INTERNAL TRANSFERS
-- ============================================
CREATE TABLE IF NOT EXISTS internal_transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    from_account_id INT NOT NULL,
    to_account_id INT NOT NULL,
    transfer_id VARCHAR(20) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    memo VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(id),
    INDEX idx_user_id (user_id),
    INDEX idx_transfer_id (transfer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- RECURRING INVESTMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_investments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') DEFAULT 'monthly',
    next_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    last_run_date DATE NULL,
    total_invested DECIMAL(15,2) DEFAULT 0.00,
    runs_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_user_id (user_id),
    INDEX idx_next_date (next_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- MARKET DATA CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS market_data_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(10) NOT NULL,
    data_type ENUM('quote', 'history', 'intraday') DEFAULT 'quote',
    data JSON,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE KEY uk_symbol_type (symbol, data_type),
    INDEX idx_symbol (symbol),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CREATE INDEXES FOR EXISTING TABLES
-- ============================================
-- Add account_type_id to accounts if not exists
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_type_id INT;
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS margin_enabled BOOLEAN DEFAULT FALSE;
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS drip_enabled BOOLEAN DEFAULT FALSE;

-- ============================================
-- INSERT DEFAULT PREFERENCES FOR EXISTING USERS
-- ============================================
INSERT IGNORE INTO user_preferences (user_id)
SELECT id FROM users;

-- ============================================
-- CREATE DEFAULT WATCHLIST FOR EXISTING USERS
-- ============================================
INSERT IGNORE INTO watchlists (user_id, name, is_default)
SELECT id, 'My Watchlist', TRUE FROM users;

SELECT 'Database schema created successfully!' as Status;