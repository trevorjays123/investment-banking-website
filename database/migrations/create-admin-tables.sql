-- ============================================
-- ADMIN TABLES MIGRATION
-- ============================================
-- Creates tables required for admin functionality

-- ============================================
-- ADMIN SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(255),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default settings
INSERT IGNORE INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'Apex Capital', 'string', 'Website name'),
('site_tagline', 'Investment Banking Solutions', 'string', 'Website tagline'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode'),
('registration_enabled', 'true', 'boolean', 'Allow new user registrations'),
('default_min_balance', '100.00', 'number', 'Default minimum account balance'),
('transaction_fee_percent', '0.5', 'number', 'Default transaction fee percentage'),
('daily_transfer_limit', '10000.00', 'number', 'Default daily transfer limit'),
('support_email', 'support@apexcapital.com', 'string', 'Support email address'),
('support_phone', '1-800-APEX-CAP', 'string', 'Support phone number');

-- ============================================
-- SYSTEM ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_target (target_type, target_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INVESTMENTS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS investments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    investment_type ENUM('stocks', 'bonds', 'mutual_funds', 'fixed_deposit', 'real_estate', 'crypto') DEFAULT 'stocks',
    amount DECIMAL(15,2) NOT NULL,
    expected_return DECIMAL(5,2) DEFAULT 0.00,
    actual_return DECIMAL(5,2) DEFAULT NULL,
    status ENUM('active', 'matured', 'cancelled', 'pending') DEFAULT 'pending',
    start_date DATE NOT NULL,
    maturity_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_investment_type (investment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- REVENUE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_revenue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL UNIQUE,
    transaction_fees DECIMAL(15,2) DEFAULT 0.00,
    investment_fees DECIMAL(15,2) DEFAULT 0.00,
    service_charges DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample revenue data for last 30 days
INSERT IGNORE INTO daily_revenue (date, transaction_fees, investment_fees, service_charges, interest_income, total_revenue)
SELECT 
    DATE_SUB(CURDATE(), INTERVAL n DAY) as date,
    ROUND(100 + RAND() * 500, 2) as transaction_fees,
    ROUND(50 + RAND() * 300, 2) as investment_fees,
    ROUND(25 + RAND() * 150, 2) as service_charges,
    ROUND(200 + RAND() * 800, 2) as interest_income,
    ROUND(375 + RAND() * 1750, 2) as total_revenue
FROM (
    SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
    SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
    SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION
    SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
    SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION
    SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
) as days;

SELECT 'Admin tables created successfully!' as Status;