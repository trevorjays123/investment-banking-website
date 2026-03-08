-- Migration: Fix missing columns in database
-- Run this to fix schema mismatches

-- 1. Add account_name column to accounts table (if not exists)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_name VARCHAR(100) AFTER account_number;

-- 2. Add missing columns to bill_payments table
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS payment_id VARCHAR(50) AFTER id;
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS pay_from_account_id INT AFTER from_account_id;
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS user_biller_id INT AFTER user_id;
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE AFTER payment_date;
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS payee_id INT AFTER user_id;

-- Update existing rows to populate new columns from old ones
UPDATE bill_payments SET payment_id = CONCAT('BILL-', LPAD(id, 8, '0')) WHERE payment_id IS NULL;
UPDATE bill_payments SET pay_from_account_id = from_account_id WHERE pay_from_account_id IS NULL;

-- 3. Create documents table if not exists
CREATE TABLE IF NOT EXISTS documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  account_id INT,
  document_type VARCHAR(50) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_url VARCHAR(500),
  file_size INT,
  mime_type VARCHAR(100),
  document_date DATE,
  description TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_document_type (document_type),
  INDEX idx_document_date (document_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
