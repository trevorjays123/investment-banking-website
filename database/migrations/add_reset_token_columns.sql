-- Add password reset token columns to users table
-- Run this migration to support password reset functionality

USE `online_banking`;

-- Add reset_token column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL;

-- Add reset_expires column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP NULL DEFAULT NULL;

-- Add index for reset_token lookups
CREATE INDEX IF NOT EXISTS idx_reset_token ON users(reset_token);

-- Verify the columns were added
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM 
    INFORMATION_SCHEMA.COLUMNS 
WHERE 
    TABLE_SCHEMA = 'online_banking' 
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME IN ('reset_token', 'reset_expires');