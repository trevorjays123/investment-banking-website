-- Performance Optimization Indexes for Online Banking Database
-- Run this after setup.sql to improve query performance

-- ============================================
-- USERS TABLE INDEXES
-- ============================================

-- Index on email for fast login lookups (already unique constraint)
-- CREATE INDEX idx_users_email ON users(email);

-- Index on created_at for sorting users by registration date
CREATE INDEX idx_users_created_at ON users(created_at);

-- Index on role for fast role-based lookups
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- ACCOUNTS TABLE INDEXES
-- ============================================

-- Index on user_id for fast account lookups by user
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Index on account_number for fast account lookups (already unique constraint)
-- CREATE INDEX idx_accounts_account_number ON accounts(account_number);

-- Index on account_type for filtering by account type
CREATE INDEX idx_accounts_account_type ON accounts(account_type);

-- Index on status for filtering active/frozen/closed accounts
CREATE INDEX idx_accounts_status ON accounts(status);

-- Composite index for common queries: user's active accounts
CREATE INDEX idx_accounts_user_status ON accounts(user_id, status);

-- ============================================
-- TRANSACTIONS TABLE INDEXES
-- ============================================

-- Index on from_account_id for tracking outgoing transfers
CREATE INDEX idx_transactions_from_account_id ON transactions(from_account_id);

-- Index on to_account_id for tracking incoming transfers
CREATE INDEX idx_transactions_to_account_id ON transactions(to_account_id);

-- Index on transaction_type for filtering by type
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Index on created_at for sorting and date range queries
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Index on status for filtering by status
CREATE INDEX idx_transactions_status ON transactions(status);

-- Composite index for account transaction history (most common query)
CREATE INDEX idx_transactions_account_date ON transactions(from_account_id, created_at DESC);

-- Composite index for transfer tracking
CREATE INDEX idx_transactions_transfer_lookup ON transactions(from_account_id, to_account_id, created_at DESC);

-- ============================================
-- PAYEES TABLE INDEXES
-- ============================================

-- Index on user_id for fast payee lookups by user
CREATE INDEX idx_payees_user_id ON payees(user_id);

-- ============================================
-- BILL_PAYMENTS TABLE INDEXES
-- ============================================

-- Index on user_id for fast bill payment lookups by user
CREATE INDEX idx_bill_payments_user_id ON bill_payments(user_id);

-- Index on from_account_id for bill payments by account
CREATE INDEX idx_bill_payments_from_account_id ON bill_payments(from_account_id);

-- Index on payee_id for bill payments by payee
CREATE INDEX idx_bill_payments_payee_id ON bill_payments(payee_id);

-- Index on payment_date for date-based queries
CREATE INDEX idx_bill_payments_payment_date ON bill_payments(payment_date);

-- Index on status for filtering by status
CREATE INDEX idx_bill_payments_status ON bill_payments(status);

-- Composite index for user's pending bill payments
CREATE INDEX idx_bill_payments_user_status ON bill_payments(user_id, status);

-- ============================================
-- AUDIT_LOGS TABLE INDEXES
-- ============================================

-- Index on user_id for audit log lookups by user
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- Index on action for filtering by action type
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Index on created_at for sorting and date range queries
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Composite index for user activity timeline
CREATE INDEX idx_audit_logs_user_timeline ON audit_logs(user_id, created_at DESC);

-- ============================================
-- SESSIONS TABLE INDEXES
-- ============================================

-- Index on user_id for session lookups by user
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index on expires_at for session cleanup
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Index on token for session validation (already unique constraint)
-- CREATE INDEX idx_sessions_token ON sessions(token);

-- ============================================
-- ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- ============================================

-- Note: Run ANALYZE TABLE after inserting data to update statistics
-- ANALYZE TABLE users;
-- ANALYZE TABLE accounts;
-- ANALYZE TABLE transactions;
-- ANALYZE TABLE payees;
-- ANALYZE TABLE bill_payments;
-- ANALYZE TABLE sessions;
-- ANALYZE TABLE audit_logs;
