-- Investment Banking Platform Database Schema
-- Version: 2.0.0
-- Compatible with MySQL 8.0+

-- ============================================
-- ACCOUNT TYPES AND CONFIGURATION
-- ============================================

CREATE TABLE IF NOT EXISTS account_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    description TEXT,
    minimum_balance DECIMAL(15,2) DEFAULT 0.00,
    maintenance_fee DECIMAL(10,2) DEFAULT 0.00,
    interest_rate DECIMAL(5,4) DEFAULT 0.0000,
    is_tax_advantaged BOOLEAN DEFAULT FALSE,
    tax_advantage_type ENUM('traditional_ira', 'roth_ira', '401k', 'hsa', 'esa', 'none') DEFAULT 'none',
    margin_eligible BOOLEAN DEFAULT FALSE,
    options_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default account types
INSERT INTO account_types (type_code, type_name, description, minimum_balance, interest_rate, is_tax_advantaged, tax_advantage_type) VALUES
('individual_brokerage', 'Individual Brokerage', 'Standard taxable investment account', 0.00, 0.0000, FALSE, 'none'),
('joint_brokerage', 'Joint Brokerage', 'Joint taxable investment account for two or more people', 0.00, 0.0000, FALSE, 'none'),
('traditional_ira', 'Traditional IRA', 'Tax-deferred retirement account', 0.00, 0.0000, TRUE, 'traditional_ira'),
('roth_ira', 'Roth IRA', 'After-tax retirement account with tax-free growth', 0.00, 0.0000, TRUE, 'roth_ira'),
('rollover_ira', 'Rollover IRA', 'IRA for rolling over 401(k) or other retirement funds', 0.00, 0.0000, TRUE, 'traditional_ira'),
('sep_ira', 'SEP IRA', 'Simplified Employee Pension IRA for self-employed', 0.00, 0.0000, TRUE, 'traditional_ira'),
('simple_ira', 'SIMPLE IRA', 'Savings Incentive Match Plan for small businesses', 0.00, 0.0000, TRUE, 'traditional_ira'),
('custodial', 'Custodial Account (UTMA/UGMA)', 'Investment account for minors', 0.00, 0.0000, FALSE, 'none'),
('trust', 'Trust Account', 'Investment account held in trust', 2500.00, 0.0000, FALSE, 'none'),
('corporate', 'Corporate Account', 'Investment account for businesses', 10000.00, 0.0000, FALSE, 'none'),
('partnership', 'Partnership Account', 'Investment account for partnerships', 10000.00, 0.0000, FALSE, 'none'),
('checking', 'Cash Management', 'Interest-bearing checking account', 0.00, 0.0150, FALSE, 'none'),
('savings', 'High-Yield Savings', 'High-yield savings account', 0.00, 0.0400, FALSE, 'none'),
('money_market', 'Money Market', 'Money market fund account', 1.00, 0.0480, FALSE, 'none'),
('margin', 'Margin Account', 'Brokerage account with margin trading', 2000.00, 0.0000, FALSE, 'none');

-- ============================================
-- ENHANCED ACCOUNTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_type_id INT NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100),
    status ENUM('pending', 'active', 'frozen', 'closed', 'restricted') DEFAULT 'pending',
    balance DECIMAL(18,2) DEFAULT 0.00,
    available_balance DECIMAL(18,2) DEFAULT 0.00,
    pending_balance DECIMAL(18,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Margin specific fields
    margin_enabled BOOLEAN DEFAULT FALSE,
    margin_balance DECIMAL(18,2) DEFAULT 0.00,
    margin_used DECIMAL(18,2) DEFAULT 0.00,
    margin_equity DECIMAL(18,2) DEFAULT 0.00,
    maintenance_margin DECIMAL(18,2) DEFAULT 0.00,
    buying_power DECIMAL(18,2) DEFAULT 0.00,
    margin_interest_rate DECIMAL(5,4) DEFAULT 0.0850,
    
    -- Interest/Sweep
    sweep_enabled BOOLEAN DEFAULT TRUE,
    sweep_target_account_id INT,
    interest_earned_ytd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Account settings
    drip_enabled BOOLEAN DEFAULT FALSE, -- Dividend Reinvestment Plan
    fractional_shares_enabled BOOLEAN DEFAULT TRUE,
    options_level TINYINT DEFAULT 0, -- 0=none, 1=covered, 2=standard, 3=advanced
    day_trading_enabled BOOLEAN DEFAULT FALSE,
    pattern_day_trader BOOLEAN DEFAULT FALSE,
    day_trades_remaining TINYINT DEFAULT 0,
    
    -- Compliance
    kyc_verified BOOLEAN DEFAULT FALSE,
    kyc_verified_at TIMESTAMP NULL,
    accreditation_status ENUM('not_verified', 'verified', 'pending', 'expired') DEFAULT 'not_verified',
    accredited_at TIMESTAMP NULL,
    
    -- Joint account fields
    joint_owner_id INT,
    joint_permissions ENUM('full', 'limited', 'view_only') DEFAULT 'full',
    
    -- Custodial/Trust fields
    custodian_name VARCHAR(100),
    custodian_relationship VARCHAR(50),
    beneficiary_name VARCHAR(100),
    beneficiary_relationship VARCHAR(50),
    
    -- Fees and limits
    monthly_fee DECIMAL(10,2) DEFAULT 0.00,
    fee_waived BOOLEAN DEFAULT FALSE,
    daily_transfer_limit DECIMAL(15,2) DEFAULT 50000.00,
    daily_withdrawal_limit DECIMAL(15,2) DEFAULT 5000.00,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_type_id) REFERENCES account_types(id),
    INDEX idx_account_user (user_id),
    INDEX idx_account_number (account_number),
    INDEX idx_account_status (status)
);

-- ============================================
-- EXTERNAL ACCOUNTS (Linked Bank Accounts)
-- ============================================

CREATE TABLE IF NOT EXISTS external_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    institution_name VARCHAR(100) NOT NULL,
    institution_id VARCHAR(50), -- Plaid institution_id
    account_name VARCHAR(100),
    account_type ENUM('checking', 'savings', 'money_market', 'brokerage', 'other') NOT NULL,
    account_number_masked VARCHAR(20), -- Last 4 digits only
    account_number_encrypted TEXT, -- Encrypted full account number
    routing_number VARCHAR(20),
    balance DECIMAL(15,2),
    balance_updated_at TIMESTAMP NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    verification_status ENUM('pending', 'micro_deposits_initiated', 'verified', 'verification_failed', 'expired') DEFAULT 'pending',
    verification_method ENUM('instant', 'micro_deposits', 'plaid', 'manual') DEFAULT 'manual',
    micro_deposit_1 DECIMAL(6,2),
    micro_deposit_2 DECIMAL(6,2),
    micro_deposits_sent_at TIMESTAMP NULL,
    verified_at TIMESTAMP NULL,
    plaid_access_token TEXT,
    plaid_item_id VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    nickname VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_external_user (user_id),
    INDEX idx_external_status (verification_status)
);

-- ============================================
-- TRANSFERS
-- ============================================

CREATE TABLE IF NOT EXISTS transfers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    transfer_type ENUM('ach', 'wire', 'internal', 'acats', 'check', 'instant', 'rtp') NOT NULL,
    transfer_direction ENUM('incoming', 'outgoing') NOT NULL,
    
    -- Source/Destination
    from_account_id INT,
    from_external_account_id INT,
    to_account_id INT,
    to_external_account_id INT,
    to_routing_number VARCHAR(20),
    to_account_number_encrypted TEXT,
    to_account_name VARCHAR(100),
    to_institution_name VARCHAR(100),
    
    -- Transfer Details
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'returned', 'review') DEFAULT 'pending',
    priority ENUM('standard', 'same_day', 'next_day', 'instant') DEFAULT 'standard',
    
    -- ACH Specific
    ach_nacha_id VARCHAR(50),
    ach_trace_number VARCHAR(50),
    ach_return_code VARCHAR(10),
    
    -- Wire Specific
    wire_swift_code VARCHAR(11),
    wire_aba_routing VARCHAR(20),
    wire_beneficiary_name VARCHAR(100),
    wire_beneficiary_address TEXT,
    wire_intermediary_bank VARCHAR(100),
    wire_reference VARCHAR(50),
    wire_fees DECIMAL(10,2) DEFAULT 0.00,
    
    -- International
    is_international BOOLEAN DEFAULT FALSE,
    iban VARCHAR(34),
    beneficiary_bank_country VARCHAR(3),
    exchange_rate DECIMAL(12,6),
    converted_amount DECIMAL(18,2),
    
    -- ACATS Specific
    acats_transfer_type ENUM('full', 'partial') DEFAULT 'full',
    acats_status ENUM('initiated', 'submitted', 'in_review', 'approved', 'in_transit', 'completed', 'rejected') DEFAULT 'initiated',
    delivering_broker VARCHAR(100),
    delivering_account VARCHAR(50),
    
    -- Fees
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    fee_waived BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    notes TEXT,
    user_initiated BOOLEAN DEFAULT TRUE,
    initiated_by INT,
    
    -- Scheduling
    scheduled_date DATE,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually') DEFAULT NULL,
    recurring_end_date DATE,
    parent_transfer_id INT,
    
    -- Risk/Compliance
    risk_score TINYINT DEFAULT 0,
    review_required BOOLEAN DEFAULT FALSE,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (from_external_account_id) REFERENCES external_accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (to_external_account_id) REFERENCES external_accounts(id) ON DELETE SET NULL,
    INDEX idx_transfer_user (user_id),
    INDEX idx_transfer_status (status),
    INDEX idx_transfer_type (transfer_type),
    INDEX idx_transfer_reference (reference_number),
    INDEX idx_transfer_scheduled (scheduled_date, status)
);

-- ============================================
-- SECURITIES AND MARKET DATA
-- ============================================

CREATE TABLE IF NOT EXISTS securities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    cusip VARCHAR(9),
    isin VARCHAR(12),
    sedol VARCHAR(7),
    company_name VARCHAR(200) NOT NULL,
    security_type ENUM('stock', 'etf', 'mutual_fund', 'bond', 'option', 'cryptocurrency', 'reit', 'adr', 'preferred', 'warrant', 'right', 'other') NOT NULL,
    exchange VARCHAR(20),
    currency VARCHAR(3) DEFAULT 'USD',
    sector VARCHAR(100),
    industry VARCHAR(100),
    country VARCHAR(3),
    market_cap_category ENUM('mega', 'large', 'mid', 'small', 'micro', 'nano') DEFAULT NULL,
    is_fractional_eligible BOOLEAN DEFAULT TRUE,
    is_drip_eligible BOOLEAN DEFAULT TRUE,
    is_marginable BOOLEAN DEFAULT TRUE,
    is_shortable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    last_price DECIMAL(15,6),
    bid_price DECIMAL(15,6),
    ask_price DECIMAL(15,6),
    volume BIGINT,
    avg_volume BIGINT,
    beta DECIMAL(8,4),
    dividend_yield DECIMAL(8,4) DEFAULT 0.0000,
    dividend_frequency ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'none') DEFAULT 'none',
    ex_dividend_date DATE,
    pe_ratio DECIMAL(10,2),
    eps DECIMAL(15,4),
    fifty_two_week_high DECIMAL(15,6),
    fifty_two_week_low DECIMAL(15,6),
    description TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_security_symbol (symbol),
    INDEX idx_security_type (security_type)
);

-- ============================================
-- POSITIONS (Current Holdings)
-- ============================================

CREATE TABLE IF NOT EXISTS positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    quantity DECIMAL(18,6) NOT NULL,
    available_quantity DECIMAL(18,6) NOT NULL,
    average_cost DECIMAL(18,6) NOT NULL,
    total_cost DECIMAL(18,2) NOT NULL,
    current_price DECIMAL(15,6),
    market_value DECIMAL(18,2),
    unrealized_gain_loss DECIMAL(18,2),
    unrealized_gain_loss_percent DECIMAL(10,4),
    realized_gain_loss_ytd DECIMAL(18,2) DEFAULT 0.00,
    
    -- Lots tracking
    lot_method ENUM('fifo', 'lifo', 'hifo', 'specific', 'average') DEFAULT 'fifo',
    
    -- Dividend tracking
    dividends_received_ytd DECIMAL(15,2) DEFAULT 0.00,
    
    -- Margin
    marginable BOOLEAN DEFAULT TRUE,
    margin_requirement DECIMAL(5,4) DEFAULT 0.5000,
    
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    UNIQUE KEY unique_position (account_id, security_id),
    INDEX idx_position_account (account_id),
    INDEX idx_position_security (security_id)
);

-- ============================================
-- LOTS (Tax Lot Tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS lots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    quantity DECIMAL(18,6) NOT NULL,
    remaining_quantity DECIMAL(18,6) NOT NULL,
    cost_basis DECIMAL(18,6) NOT NULL,
    total_cost DECIMAL(18,2) NOT NULL,
    acquisition_date DATE NOT NULL,
    acquisition_method ENUM('purchase', 'transfer', 'dividend_reinvest', 'stock_split', 'gift', 'inheritance') DEFAULT 'purchase',
    holding_period_days INT,
    is_long_term BOOLEAN DEFAULT FALSE,
    wash_sale_disallowed DECIMAL(15,2) DEFAULT 0.00,
    original_lot_id INT, -- For stock splits
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_lot_position (position_id),
    INDEX idx_lot_account (account_id)
);

-- ============================================
-- ORDERS (Trading)
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    user_id INT NOT NULL,
    security_id INT NOT NULL,
    
    -- Order identification
    order_id VARCHAR(50) UNIQUE NOT NULL,
    client_order_id VARCHAR(100),
    parent_order_id INT,
    
    -- Order details
    order_type ENUM('market', 'limit', 'stop', 'stop_limit', 'trailing_stop', 'bracket', 'oco', 'oto') NOT NULL,
    side ENUM('buy', 'sell', 'sell_short', 'buy_to_cover') NOT NULL,
    status ENUM('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired', 'pending_cancel', 'pending_replace', 'replaced') DEFAULT 'pending',
    
    -- Quantities
    quantity DECIMAL(18,6) NOT NULL,
    filled_quantity DECIMAL(18,6) DEFAULT 0.000000,
    remaining_quantity DECIMAL(18,6),
    
    -- Fractional shares
    is_fractional BOOLEAN DEFAULT FALSE,
    fractional_quantity DECIMAL(18,6),
    
    -- Prices
    limit_price DECIMAL(15,6),
    stop_price DECIMAL(15,6),
    trail_amount DECIMAL(15,6),
    trail_percent DECIMAL(6,2),
    average_fill_price DECIMAL(15,6),
    last_fill_price DECIMAL(15,6),
    
    -- Timing
    time_in_force ENUM('day', 'gtc', 'gtd', 'moc', 'moo', 'ioc', 'fok', 'at_open', 'at_close') DEFAULT 'day',
    good_till_date TIMESTAMP NULL,
    all_or_none BOOLEAN DEFAULT FALSE,
    extended_hours BOOLEAN DEFAULT FALSE,
    
    -- Execution
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP NULL,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    filled_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    expired_at TIMESTAMP NULL,
    cancel_requested_at TIMESTAMP NULL,
    cancel_reason TEXT,
    
    -- Fees and commission
    commission DECIMAL(10,2) DEFAULT 0.00,
    sec_fee DECIMAL(10,2) DEFAULT 0.00,
    taf_fee DECIMAL(10,2) DEFAULT 0.00,
    exchange_fee DECIMAL(10,2) DEFAULT 0.00,
    total_fees DECIMAL(10,2) DEFAULT 0.00,
    estimated_total DECIMAL(18,2),
    
    -- Risk and compliance
    risk_check_status ENUM('pending', 'passed', 'failed', 'warning') DEFAULT 'pending',
    risk_check_message TEXT,
    day_trade BOOLEAN DEFAULT FALSE,
    good_fa_violation BOOLEAN DEFAULT FALSE,
    free_riding BOOLEAN DEFAULT FALSE,
    
    -- Source
    source ENUM('web', 'mobile', 'api', 'auto', 'advisor') DEFAULT 'web',
    notes TEXT,
    user_ip VARCHAR(45),
    user_agent TEXT,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_order_account (account_id),
    INDEX idx_order_user (user_id),
    INDEX idx_order_status (status),
    INDEX idx_order_symbol (security_id),
    INDEX idx_order_id (order_id),
    INDEX idx_order_dates (requested_at, filled_at)
);

-- ============================================
-- ORDER EXECUTIONS (Fills)
-- ============================================

CREATE TABLE IF NOT EXISTS executions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    execution_id VARCHAR(50) UNIQUE NOT NULL,
    quantity DECIMAL(18,6) NOT NULL,
    price DECIMAL(15,6) NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    liquidity_flag ENUM('added', 'removed') DEFAULT NULL,
    venue VARCHAR(50),
    commission DECIMAL(10,2) DEFAULT 0.00,
    fees DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_execution_order (order_id),
    INDEX idx_execution_time (execution_time)
);

-- ============================================
-- ENHANCED TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Transaction identification
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    reference_number VARCHAR(50),
    
    -- Transaction classification
    transaction_type ENUM('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'ach_in', 'ach_out', 'wire_in', 'wire_out', 'check_deposit', 'check_withdrawal', 'dividend', 'interest', 'fee', 'commission', 'tax', 'adjustment', 'buy', 'sell', 'sell_short', 'buy_to_cover', 'option_assignment', 'option_exercise', 'stock_split', 'merger', 'spinoff', 'rights_issue', 'acats_in', 'acats_out', 'internal_transfer', 'margin_interest', 'fx_conversion', 'refund', 'bonus', 'reversal') NOT NULL,
    category ENUM('transfer', 'investment', 'income', 'fee', 'trade', 'payment', 'adjustment', 'other') DEFAULT 'other',
    subcategory VARCHAR(50),
    
    -- Amount and balance
    amount DECIMAL(18,2) NOT NULL,
    running_balance DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Related entities
    related_account_id INT,
    related_transaction_id INT,
    related_order_id INT,
    related_transfer_id INT,
    related_security_id INT,
    
    -- Trading specific
    quantity DECIMAL(18,6),
    price DECIMAL(15,6),
    gross_amount DECIMAL(18,2),
    net_amount DECIMAL(18,2),
    
    -- Fees breakdown
    commission DECIMAL(10,2) DEFAULT 0.00,
    sec_fee DECIMAL(10,2) DEFAULT 0.00,
    taf_fee DECIMAL(10,2) DEFAULT 0.00,
    exchange_fee DECIMAL(10,2) DEFAULT 0.00,
    other_fees DECIMAL(10,2) DEFAULT 0.00,
    total_fees DECIMAL(10,2) DEFAULT 0.00,
    
    -- Tax tracking
    tax_withheld DECIMAL(15,2) DEFAULT 0.00,
    cost_basis DECIMAL(18,6),
    realized_gain_loss DECIMAL(18,2),
    is_long_term BOOLEAN,
    wash_sale_disallowed DECIMAL(15,2) DEFAULT 0.00,
    
    -- Status
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed') DEFAULT 'completed',
    
    -- Descriptions
    description TEXT,
    memo TEXT,
    payee_name VARCHAR(100),
    payer_name VARCHAR(100),
    
    -- Timestamps
    transaction_date DATE NOT NULL,
    settlement_date DATE,
    posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Audit
    created_by INT,
    reversed_at TIMESTAMP NULL,
    reversed_by INT,
    reversal_reason TEXT,
    
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (related_account_id) REFERENCES accounts(id),
    FOREIGN KEY (related_security_id) REFERENCES securities(id),
    INDEX idx_trans_account (account_id),
    INDEX idx_trans_user (user_id),
    INDEX idx_trans_date (transaction_date),
    INDEX idx_trans_type (transaction_type),
    INDEX idx_trans_reference (reference_number)
);

-- ============================================
-- BENEFICIARIES
-- ============================================

CREATE TABLE IF NOT EXISTS beneficiaries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    beneficiary_type ENUM('primary', 'contingent') DEFAULT 'primary',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE,
    ssn_encrypted VARCHAR(100),
    relationship VARCHAR(50),
    percentage DECIMAL(5,2) NOT NULL,
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(3) DEFAULT 'USA',
    phone VARCHAR(20),
    email VARCHAR(255),
    tin_type ENUM('ssn', 'ein', 'itin') DEFAULT 'ssn',
    trust_name VARCHAR(200),
    is_trust_beneficiary BOOLEAN DEFAULT FALSE,
    is_minors_trust BOOLEAN DEFAULT FALSE,
    guardian_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_beneficiary_account (account_id)
);

-- ============================================
-- DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    document_type ENUM('government_id', 'passport', 'utility_bill', 'bank_statement', 'tax_form', 'account_statement', 'trade_confirmation', 'tax_document', 'kyc_document', 'accreditation', 'trust_agreement', 'power_of_attorney', 'beneficiary_form', 'signature_card', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(255),
    storage_provider ENUM('local', 's3', 'gcs', 'azure') DEFAULT 'local',
    
    -- Status
    status ENUM('pending', 'uploaded', 'verified', 'rejected', 'expired') DEFAULT 'pending',
    verification_status ENUM('pending', 'approved', 'rejected', 'needs_review') DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    
    -- Expiration
    expiration_date DATE,
    is_expired BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    description TEXT,
    tags JSON,
    upload_ip VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_document_user (user_id),
    INDEX idx_document_type (document_type),
    INDEX idx_document_status (status)
);

-- ============================================
-- ALERTS AND NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    alert_type ENUM('price', 'balance', 'transaction', 'order', 'deposit', 'withdrawal', 'bill_reminder', 'security', 'news', 'dividend', 'margin_call', 'password_change', 'login', 'kyc_expiry', 'account_update', 'trade_confirmation', 'tax_document', 'statement', 'custom') NOT NULL,
    alert_name VARCHAR(100),
    alert_description TEXT,
    
    -- Alert conditions
    condition_type ENUM('above', 'below', 'equals', 'changes_by', 'occurs') NOT NULL,
    condition_value DECIMAL(18,6),
    condition_threshold DECIMAL(18,6),
    security_id INT,
    
    -- Delivery
    delivery_methods JSON, -- ['email', 'sms', 'push', 'in_app']
    email_recipient VARCHAR(255),
    phone_number VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP NULL,
    trigger_count INT DEFAULT 0,
    max_triggers INT,
    
    -- Frequency
    frequency ENUM('once', 'daily', 'weekly', 'monthly', 'every_occurrence') DEFAULT 'every_occurrence',
    cooldown_hours INT DEFAULT 1,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_alert_user (user_id),
    INDEX idx_alert_type (alert_type)
);

-- ============================================
-- NOTIFICATION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    alert_id INT,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    delivery_method ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    status ENUM('pending', 'sent', 'delivered', 'read', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    failure_reason TEXT,
    external_id VARCHAR(100),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE SET NULL,
    INDEX idx_notification_user (user_id),
    INDEX idx_notification_status (status)
);

-- ============================================
-- FEE SCHEDULES
-- ============================================

CREATE TABLE IF NOT EXISTS fee_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fee_code VARCHAR(50) UNIQUE NOT NULL,
    fee_name VARCHAR(100) NOT NULL,
    fee_description TEXT,
    fee_type ENUM('flat', 'percentage', 'tiered', 'per_share', 'bps') NOT NULL,
    amount DECIMAL(15,2),
    percentage DECIMAL(8,4),
    minimum_fee DECIMAL(10,2) DEFAULT 0.00,
    maximum_fee DECIMAL(15,2),
    account_type_ids JSON, -- Applicable account types
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default fees
INSERT INTO fee_schedules (fee_code, fee_name, fee_description, fee_type, amount, percentage, minimum_fee) VALUES
('ACH_STANDARD', 'Standard ACH Transfer', 'Standard ACH transfer fee', 'flat', 0.00, NULL, 0.00),
('ACH_INSTANT', 'Instant ACH Transfer', 'Instant ACH transfer fee', 'percentage', 0.00, 1.5000, 0.25),
('WIRE_DOMESTIC', 'Domestic Wire Transfer', 'Domestic wire transfer fee', 'flat', 25.00, NULL, 25.00),
('WIRE_INTERNATIONAL', 'International Wire Transfer', 'International wire transfer fee', 'flat', 45.00, NULL, 45.00),
('STOCK_TRADE', 'Stock Trade Commission', 'Commission for stock trades', 'flat', 0.00, NULL, 0.00),
('OPTIONS_TRADE', 'Options Trade Commission', 'Commission for options trades', 'flat', 0.65, NULL, 0.00),
('OPTIONS_CONTRACT', 'Options Contract Fee', 'Per contract fee for options', 'per_share', 0.65, NULL, 0.00),
('MARGIN_INTEREST', 'Margin Interest Rate', 'Annual margin interest rate', 'percentage', NULL, 8.5000, 0.00),
('ACCOUNT_MAINTENANCE', 'Account Maintenance Fee', 'Monthly account maintenance fee', 'flat', 0.00, NULL, 0.00),
('PAPER_STATEMENT', 'Paper Statement Fee', 'Fee for paper statements', 'flat', 5.00, NULL, 0.00),
('CHECK_DEPOSIT', 'Mobile Check Deposit Fee', 'Fee for mobile check deposit', 'percentage', NULL, 0.2500, 0.00),
('CHECK_ISSUANCE', 'Check Issuance Fee', 'Fee for issuing checks', 'flat', 2.00, NULL, 0.00),
('RETURNED_ITEM', 'Returned Item Fee', 'Fee for returned checks/ACH', 'flat', 25.00, NULL, 25.00),
('OVERDRAFT', 'Overdraft Fee', 'Overdraft/insufficient funds fee', 'flat', 0.00, NULL, 0.00),
('EXCESS_ACTIVITY', 'Excess Activity Fee', 'Reg D excess withdrawal fee', 'flat', 10.00, NULL, 0.00);

-- ============================================
-- USER PREFERENCES (Enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    
    -- Theme preferences
    theme ENUM('light', 'dark', 'system') DEFAULT 'dark',
    accent_color VARCHAR(7) DEFAULT '#3b82f6',
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    
    -- Security preferences
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_method ENUM('app', 'sms', 'email') DEFAULT 'app',
    biometric_enabled BOOLEAN DEFAULT FALSE,
    session_timeout_minutes INT DEFAULT 30,
    
    -- Trading preferences
    default_order_type ENUM('market', 'limit', 'stop') DEFAULT 'market',
    default_time_in_force ENUM('day', 'gtc') DEFAULT 'day',
    confirm_trades BOOLEAN DEFAULT TRUE,
    show_extended_hours BOOLEAN DEFAULT FALSE,
    default_lot_method ENUM('fifo', 'lifo', 'hifo', 'specific') DEFAULT 'fifo',
    
    -- Display preferences
    default_account_id INT,
    show_fractional_shares BOOLEAN DEFAULT TRUE,
    hide_balances BOOLEAN DEFAULT FALSE,
    homepage_view ENUM('dashboard', 'portfolio', 'trading', 'accounts') DEFAULT 'dashboard',
    
    -- Privacy
    hide_amounts_on_home BOOLEAN DEFAULT FALSE,
    require_pin_on_launch BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- ============================================
-- PAYEE MANAGEMENT (Enhanced Bill Pay)
-- ============================================

CREATE TABLE IF NOT EXISTS payees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    payee_name VARCHAR(100) NOT NULL,
    payee_type ENUM('company', 'individual', 'government', 'utility', 'other') DEFAULT 'company',
    nickname VARCHAR(50),
    
    -- Account details
    account_number VARCHAR(50),
    account_number_encrypted TEXT,
    routing_number VARCHAR(20),
    
    -- Contact info
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(3) DEFAULT 'USA',
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Payment details
    default_payment_account_id INT,
    default_amount DECIMAL(15,2),
    default_frequency ENUM('one_time', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually') DEFAULT 'one_time',
    category VARCHAR(50),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Memo
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (default_payment_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_payee_user (user_id)
);

-- ============================================
-- SCHEDULED PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS scheduled_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    payee_id INT NOT NULL,
    
    -- Payment details
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    status ENUM('scheduled', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'scheduled',
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'annually') DEFAULT NULL,
    end_date DATE,
    next_payment_date DATE,
    recurrence_count INT DEFAULT 0,
    parent_payment_id INT,
    
    -- Payment method
    payment_method ENUM('ach', 'check', 'wire', 'internal') DEFAULT 'ach',
    
    -- Reference
    confirmation_number VARCHAR(50),
    reference_number VARCHAR(50),
    
    -- Audit
    memo TEXT,
    cancelled_at TIMESTAMP NULL,
    cancelled_by INT,
    cancellation_reason TEXT,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    failure_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (payee_id) REFERENCES payees(id),
    FOREIGN KEY (parent_payment_id) REFERENCES scheduled_payments(id) ON DELETE SET NULL,
    INDEX idx_payment_user (user_id),
    INDEX idx_payment_date (payment_date, status),
    INDEX idx_payment_recurring (is_recurring, next_payment_date)
);

-- ============================================
-- CHECK DEPOSITS
-- ============================================

CREATE TABLE IF NOT EXISTS check_deposits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    
    -- Check details
    check_number VARCHAR(20),
    check_amount DECIMAL(15,2) NOT NULL,
    payer_name VARCHAR(100),
    
    -- Images
    front_image_path VARCHAR(500),
    back_image_path VARCHAR(500),
    front_image_s3_key VARCHAR(255),
    back_image_s3_key VARCHAR(255),
    
    -- Status
    status ENUM('pending', 'processing', 'accepted', 'rejected', 'cleared', 'returned') DEFAULT 'pending',
    rejection_reason TEXT,
    
    -- Processing
    processed_at TIMESTAMP NULL,
    cleared_at TIMESTAMP NULL,
    returned_at TIMESTAMP NULL,
    return_reason VARCHAR(50),
    
    -- Fees
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Reference
    reference_number VARCHAR(50),
    
    -- Funds availability
    available_amount DECIMAL(15,2),
    hold_amount DECIMAL(15,2),
    hold_release_date DATE,
    hold_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    INDEX idx_check_user (user_id),
    INDEX idx_check_status (status)
);

-- ============================================
-- INVESTMENT GOALS
-- ============================================

CREATE TABLE IF NOT EXISTS investment_goals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    
    -- Goal details
    goal_name VARCHAR(100) NOT NULL,
    goal_type ENUM('retirement', 'emergency_fund', 'home_purchase', 'education', 'travel', 'wedding', 'car_purchase', 'custom') DEFAULT 'custom',
    target_amount DECIMAL(18,2) NOT NULL,
    current_amount DECIMAL(18,2) DEFAULT 0.00,
    
    -- Timeline
    target_date DATE,
    monthly_contribution DECIMAL(15,2),
    
    -- Risk profile
    risk_tolerance ENUM('conservative', 'moderate', 'aggressive') DEFAULT 'moderate',
    
    -- Progress tracking
    progress_percent DECIMAL(5,2) DEFAULT 0.00,
    on_track BOOLEAN DEFAULT TRUE,
    projected_completion_date DATE,
    
    -- Status
    status ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active',
    
    -- Auto-deposit
    auto_deposit_enabled BOOLEAN DEFAULT FALSE,
    auto_deposit_account_id INT,
    auto_deposit_frequency ENUM('weekly', 'biweekly', 'monthly') DEFAULT 'monthly',
    auto_deposit_day INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_goal_user (user_id),
    INDEX idx_goal_type (goal_type)
);

-- ============================================
-- RECURRING INVESTMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_investments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    security_id INT NOT NULL,
    
    -- Investment details
    amount DECIMAL(15,2) NOT NULL,
    frequency ENUM('daily', 'weekly', 'biweekly', 'monthly') NOT NULL,
    
    -- Schedule
    investment_day INT, -- Day of week (1-7) or day of month (1-31)
    next_investment_date DATE NOT NULL,
    
    -- Order settings
    order_type ENUM('market', 'limit') DEFAULT 'market',
    limit_price DECIMAL(15,6),
    
    -- Status
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    
    -- Tracking
    total_invested DECIMAL(18,2) DEFAULT 0.00,
    investments_count INT DEFAULT 0,
    
    -- Limits
    end_date DATE,
    max_investments INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_investment_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_recurring_user (user_id),
    INDEX idx_recurring_next (next_investment_date, status)
);

-- ============================================
-- CASH SWEEPS
-- ============================================

CREATE TABLE IF NOT EXISTS cash_sweeps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    sweep_type ENUM('money_market', 'high_yield', 'target_balance') DEFAULT 'money_market',
    target_account_id INT,
    minimum_sweep_amount DECIMAL(15,2) DEFAULT 100.00,
    target_balance DECIMAL(15,2),
    sweep_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    last_sweep_at TIMESTAMP NULL,
    total_swept DECIMAL(18,2) DEFAULT 0.00,
    interest_earned DECIMAL(15,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (target_account_id) REFERENCES accounts(id),
    INDEX idx_sweep_account (account_id)
);

-- ============================================
-- PRICE ALERTS
-- ============================================

CREATE TABLE IF NOT EXISTS price_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    security_id INT NOT NULL,
    alert_type ENUM('above', 'below', 'percent_change') NOT NULL,
    target_price DECIMAL(15,6),
    percent_change DECIMAL(8,2),
    is_active BOOLEAN DEFAULT TRUE,
    triggered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    INDEX idx_price_alert_user (user_id),
    INDEX idx_price_alert_security (security_id)
);

-- ============================================
-- STATEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS statements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    statement_type ENUM('monthly', 'quarterly', 'annual', 'trade_confirmation', 'tax_document') NOT NULL,
    statement_period_start DATE,
    statement_period_end DATE,
    statement_date DATE NOT NULL,
    file_path VARCHAR(500),
    s3_key VARCHAR(255),
    file_size INT,
    document_name VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    downloaded_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_statement_user (user_id),
    INDEX idx_statement_period (statement_period_start, statement_period_end)
);

-- ============================================
-- TAX DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS tax_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    tax_year INT NOT NULL,
    form_type ENUM('1099-B', '1099-DIV', '1099-INT', '1099-MISC', '1099-R', '5498', '1042-S', 'W-2', 'K-1', '1098') NOT NULL,
    document_path VARCHAR(500),
    s3_key VARCHAR(255),
    file_size INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    corrected BOOLEAN DEFAULT FALSE,
    corrected_at TIMESTAMP NULL,
    is_available BOOLEAN DEFAULT TRUE,
    downloaded_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_tax_doc_user (user_id),
    INDEX idx_tax_doc_year (tax_year, form_type)
);

-- ============================================
-- USER ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type ENUM('desktop', 'mobile', 'tablet', 'api', 'unknown') DEFAULT 'unknown',
    browser VARCHAR(50),
    os VARCHAR(50),
    location_city VARCHAR(100),
    location_country VARCHAR(3),
    related_entity_type VARCHAR(50),
    related_entity_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_time (created_at)
);

-- ============================================
-- KYC VERIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS kyc_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    verification_type ENUM('identity', 'address', 'ssn', 'accreditation', 'entity') NOT NULL,
    verification_provider VARCHAR(50),
    verification_id VARCHAR(100),
    status ENUM('pending', 'submitted', 'in_review', 'approved', 'rejected', 'expired') DEFAULT 'pending',
    submitted_at TIMESTAMP NULL,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT,
    rejection_reason TEXT,
    document_ids JSON,
    verification_data JSON,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_kyc_user (user_id),
    INDEX idx_kyc_status (status)
);

-- ============================================
-- WATCHLIST
-- ============================================

CREATE TABLE IF NOT EXISTS watchlists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    watchlist_name VARCHAR(100) DEFAULT 'My Watchlist',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_watchlist_user (user_id)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    watchlist_id INT NOT NULL,
    security_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (watchlist_id) REFERENCES watchlists(id) ON DELETE CASCADE,
    FOREIGN KEY (security_id) REFERENCES securities(id),
    UNIQUE KEY unique_watchlist_item (watchlist_id, security_id),
    INDEX idx_watchlist_item (watchlist_id)
);

-- ============================================
-- TRADING HOURS AND MARKET STATUS
-- ============================================

CREATE TABLE IF NOT EXISTS market_holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exchange VARCHAR(20) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100),
    is_half_day BOOLEAN DEFAULT FALSE,
    early_close_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_holiday (exchange, holiday_date),
    INDEX idx_holiday_date (holiday_date)
);

-- Insert US market holidays for 2025-2026
INSERT INTO market_holidays (exchange, holiday_date, holiday_name, is_half_day, early_close_time) VALUES
('NYSE', '2025-01-01', "New Year's Day", FALSE, NULL),
('NYSE', '2025-01-20', 'Martin Luther King Jr. Day', FALSE, NULL),
('NYSE', '2025-02-17', "Presidents' Day", FALSE, NULL),
('NYSE', '2025-04-18', 'Good Friday', FALSE, NULL),
('NYSE', '2025-05-26', 'Memorial Day', FALSE, NULL),
('NYSE', '2025-07-04', 'Independence Day', FALSE, NULL),
('NYSE', '2025-09-01', 'Labor Day', FALSE, NULL),
('NYSE', '2025-11-27', 'Thanksgiving Day', FALSE, NULL),
('NYSE', '2025-11-28', 'Day After Thanksgiving', TRUE, '13:00:00'),
('NYSE', '2025-12-24', 'Christmas Eve', TRUE, '13:00:00'),
('NYSE', '2025-12-25', 'Christmas Day', FALSE, NULL),
('NYSE', '2026-01-01', "New Year's Day", FALSE, NULL),
('NYSE', '2026-01-19', 'Martin Luther King Jr. Day', FALSE, NULL),
('NYSE', '2026-02-16', "Presidents' Day", FALSE, NULL),
('NYSE', '2026-04-03', 'Good Friday', FALSE, NULL),
('NYSE', '2026-05-25', 'Memorial Day', FALSE, NULL),
('NYSE', '2026-07-03', 'Independence Day (Observed)', FALSE, NULL),
('NYSE', '2026-09-07', 'Labor Day', FALSE, NULL),
('NYSE', '2026-11-26', 'Thanksgiving Day', FALSE, NULL),
('NYSE', '2026-11-27', 'Day After Thanksgiving', TRUE, '13:00:00'),
('NYSE', '2026-12-24', 'Christmas Eve', TRUE, '13:00:00'),
('NYSE', '2026-12-25', 'Christmas Day', FALSE, NULL);

-- ============================================
-- TRANSFER LIMITS BY ACCOUNT TIER
-- ============================================

CREATE TABLE IF NOT EXISTS account_tiers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tier_name VARCHAR(50) NOT NULL,
    tier_code VARCHAR(20) UNIQUE NOT NULL,
    minimum_balance DECIMAL(18,2) DEFAULT 0.00,
    description TEXT,
    
    -- Transfer limits
    daily_ach_limit DECIMAL(18,2) DEFAULT 25000.00,
    daily_wire_limit DECIMAL(18,2) DEFAULT 100000.00,
    daily_transfer_limit DECIMAL(18,2) DEFAULT 50000.00,
    instant_transfer_limit DECIMAL(15,2) DEFAULT 5000.00,
    
    -- Fees
    domestic_wire_fee DECIMAL(10,2) DEFAULT 25.00,
    international_wire_fee DECIMAL(10,2) DEFAULT 45.00,
    instant_transfer_fee_percent DECIMAL(5,2) DEFAULT 1.50,
    
    -- Benefits
    free_domestic_wires BOOLEAN DEFAULT FALSE,
    free_international_wires BOOLEAN DEFAULT FALSE,
    unlimited_atm_reimbursements BOOLEAN DEFAULT FALSE,
    premium_support BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default tiers
INSERT INTO account_tiers (tier_name, tier_code, minimum_balance, daily_ach_limit, daily_wire_limit, instant_transfer_limit, domestic_wire_fee, premium_support) VALUES
('Basic', 'BASIC', 0.00, 25000.00, 100000.00, 5000.00, 25.00, FALSE),
('Premium', 'PREMIUM', 50000.00, 100000.00, 500000.00, 25000.00, 15.00, TRUE),
('Elite', 'ELITE', 250000.00, 500000.00, 2000000.00, 100000.00, 0.00, TRUE),
('Private Client', 'PRIVATE', 1000000.00, 1000000.00, 5000000.00, 250000.00, 0.00, TRUE);

-- ============================================
-- TRUSTED DEVICES
-- ============================================

CREATE TABLE IF NOT EXISTS trusted_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(100),
    device_type ENUM('desktop', 'mobile', 'tablet') DEFAULT 'desktop',
    browser VARCHAR(50),
    os VARCHAR(50),
    last_ip_address VARCHAR(45),
    trusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_device_user (user_id),
    INDEX idx_device_fingerprint (device_fingerprint)
);

-- ============================================
-- SECURE MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS secure_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    sender_type ENUM('user', 'support', 'system', 'advisor') DEFAULT 'user',
    sender_id INT,
    status ENUM('unread', 'read', 'archived') DEFAULT 'unread',
    category VARCHAR(50),
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    related_entity_type VARCHAR(50),
    related_entity_id INT,
    read_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_message_user (user_id),
    INDEX idx_message_status (status)
);

-- ============================================
-- MARGIN CALLS
-- ============================================

CREATE TABLE IF NOT EXISTS margin_calls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    call_type ENUM('maintenance', 'regulation_t', 'house') NOT NULL,
    call_amount DECIMAL(18,2) NOT NULL,
    equity_amount DECIMAL(18,2),
    call_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'partially_met', 'met', 'liquidated', 'expired') DEFAULT 'pending',
    amount_met DECIMAL(18,2) DEFAULT 0.00,
    liquidation_amount DECIMAL(18,2) DEFAULT 0.00,
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_margin_call_account (account_id),
    INDEX idx_margin_call_status (status, due_date)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created ON users(created_at);