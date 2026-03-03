-- Online Banking Sample Data
-- Run this script after setup.sql to populate test data

USE online_banking;

-- Disable foreign key checks for seeding
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (order matters for foreign keys)
DELETE FROM bill_payments;
DELETE FROM payees;
DELETE FROM transactions;
DELETE FROM sessions;
DELETE FROM accounts;
DELETE FROM users;
DELETE FROM audit_logs;

-- Sample Users (password is 'password' for all)
-- Password hash for 'password' is $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

INSERT INTO users (id, email, password_hash, first_name, last_name, phone, date_of_birth, address, role, email_verified, verification_token, two_factor_enabled, created_at) VALUES
(1, 'john.doe@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', '555-0101', '1985-05-15', '123 Main Street, New York, NY 10001', 'user', TRUE, NULL, FALSE, NOW()),
(2, 'jane.smith@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', '555-0102', '1990-08-22', '456 Oak Avenue, Los Angeles, CA 90001', 'user', TRUE, NULL, FALSE, NOW()),
(3, 'bob.wilson@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bob', 'Wilson', '555-0103', '1978-12-01', '789 Pine Road, Chicago, IL 60601', 'user', TRUE, NULL, TRUE, NOW());

-- Sample Accounts
INSERT INTO accounts (id, user_id, account_number, account_type, balance, currency, status, created_at) VALUES
-- John's accounts
(1, 1, 'CHK10000001', 'checking', 5000.00, 'USD', 'active', NOW()),
(2, 1, 'SAV10000002', 'savings', 15000.00, 'USD', 'active', NOW()),
(3, 1, 'CRD10000003', 'credit', -2500.00, 'USD', 'active', NOW()),
-- Jane's accounts
(4, 2, 'CHK20000004', 'checking', 7500.00, 'USD', 'active', NOW()),
(5, 2, 'SAV20000005', 'savings', 25000.00, 'USD', 'active', NOW()),
-- Bob's accounts
(6, 3, 'CHK30000006', 'checking', 3000.00, 'USD', 'active', NOW()),
(7, 3, 'SAV30000007', 'savings', 10000.00, 'USD', 'active', NOW());

-- Sample Transactions
INSERT INTO transactions (id, from_account_id, to_account_id, amount, transaction_type, status, description, reference_number, created_at) VALUES
-- John's transactions
(1, 1, 2, 1000.00, 'transfer', 'completed', 'Savings deposit', 'TXN001', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 2, 1, 500.00, 'transfer', 'completed', 'Checking refill', 'TXN002', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, NULL, 1, 2500.00, 'deposit', 'completed', 'Salary deposit', 'DEP001', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 1, NULL, 200.00, 'withdrawal', 'completed', 'ATM withdrawal', 'WDR001', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(5, 1, 4, 150.00, 'transfer', 'completed', 'Payment to Jane', 'TXN003', DATE_SUB(NOW(), INTERVAL 5 DAY)),
-- Jane's transactions
(6, 4, 5, 2000.00, 'transfer', 'completed', 'Savings transfer', 'TXN004', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, NULL, 4, 3000.00, 'deposit', 'completed', 'Salary deposit', 'DEP002', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(8, 4, 1, 100.00, 'transfer', 'completed', 'Payment from John', 'TXN005', DATE_SUB(NOW(), INTERVAL 5 DAY)),
-- Bob's transactions
(9, 6, NULL, 100.00, 'withdrawal', 'completed', 'ATM withdrawal', 'WDR002', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(10, NULL, 6, 500.00, 'deposit', 'completed', 'Deposit', 'DEP003', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(11, 7, 6, 300.00, 'transfer', 'completed', 'Checking transfer', 'TXN006', DATE_SUB(NOW(), INTERVAL 4 DAY));

-- Sample Payees
INSERT INTO payees (id, user_id, payee_name, account_number, bank_name, routing_number, created_at) VALUES
-- John's payees
(1, 1, 'Electric Company', 'EC1000001', 'First National Bank', '021000021', NOW()),
(2, 1, 'Water Utility', 'WU1000002', 'City Bank', '021000022', NOW()),
(3, 1, 'Internet Provider', 'IP1000003', 'Tech Credit Union', '021000023', NOW()),
-- Jane's payees
(4, 2, 'Gas Company', 'GC2000001', 'Energy Bank', '021000024', NOW()),
(5, 2, 'Insurance Co', 'IC2000002', 'Safe Insurance Bank', '021000025', NOW()),
-- Bob's payees
(6, 3, 'Phone Bill', 'PB3000001', 'Mobile Network Bank', '021000026', NOW());

-- Sample Bill Payments
INSERT INTO bill_payments (id, user_id, payee_id, from_account_id, amount, payment_date, status, created_at) VALUES
(1, 1, 1, 1, 150.00, DATE_ADD(NOW(), INTERVAL 2 DAY), 'scheduled', NOW()),
(2, 1, 2, 1, 75.00, DATE_ADD(NOW(), INTERVAL 5 DAY), 'scheduled', NOW()),
(3, 2, 4, 4, 120.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'paid', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 2, 5, 4, 200.00, DATE_ADD(NOW(), INTERVAL 7 DAY), 'scheduled', NOW()),
(5, 3, 6, 6, 85.00, DATE_SUB(NOW(), INTERVAL 2 DAY), 'paid', DATE_SUB(NOW(), INTERVAL 5 DAY));

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Display summary
SELECT 'Sample data inserted successfully!' AS message;
SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS accounts_count FROM accounts;
SELECT COUNT(*) AS transactions_count FROM transactions;
SELECT COUNT(*) AS payees_count FROM payees;
SELECT COUNT(*) AS payments_count FROM bill_payments;
