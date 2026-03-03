-- Migration: Add role column to users table
-- This migration adds the role column to the users table for role-based access control
-- Run this script if the users table doesn't have a role column (older database schema)
-- Note: If the column already exists, this will throw an error
-- To make it idempotent, run this only on fresh databases or handle the error

USE online_banking;

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role VARCHAR(10) DEFAULT 'user';

-- Add index for role-based lookup
CREATE INDEX idx_users_role ON users(role);

-- Display result
SELECT 'Migration completed - role column added' AS status;