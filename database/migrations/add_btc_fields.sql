-- Migration: Add Bitcoin/Crypto fields to accounts and create btc_transactions table

-- 1. Add BTC fields to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS btc_balance DECIMAL(16,8) DEFAULT 0.00000000;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS btc_address VARCHAR(255) UNIQUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_btc_price DECIMAL(16,2);

-- 2. Create BTC transactions table
CREATE TABLE IF NOT EXISTS btc_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    tx_hash VARCHAR(255) UNIQUE,
    btc_amount DECIMAL(16,8) NOT NULL,
    usd_amount DECIMAL(16,2),
    btc_price DECIMAL(16,2),
    address_from VARCHAR(255),
    address_to VARCHAR(255),
    type ENUM('received', 'sent', 'exchange', 'deposit', 'withdrawal') DEFAULT 'deposit',
    status ENUM('pending', 'confirmed', 'failed') DEFAULT 'pending',
    confirmations INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_tx_hash (tx_hash),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Add is_crypto column to track crypto accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_crypto BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS crypto_currency VARCHAR(10) DEFAULT NULL;

-- 4. Create crypto prices table for tracking price history
CREATE TABLE IF NOT EXISTS crypto_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    currency VARCHAR(10) NOT NULL,
    usd_price DECIMAL(16,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_currency (currency),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
