-- Migration: Create user_preferences table
-- This table stores user notification and display preferences

CREATE TABLE IF NOT EXISTS user_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  
  -- Display preferences
  language VARCHAR(10) DEFAULT 'en',
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  
  -- Email notification preferences
  email_transactions BOOLEAN DEFAULT TRUE,
  email_security BOOLEAN DEFAULT TRUE,
  email_marketing BOOLEAN DEFAULT FALSE,
  
  -- SMS notification preferences
  sms_transactions BOOLEAN DEFAULT FALSE,
  sms_security BOOLEAN DEFAULT TRUE,
  
  -- Push notification preferences
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Privacy preferences
  analytics_enabled BOOLEAN DEFAULT TRUE,
  personalization_enabled BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id, language, currency, timezone, date_format)
SELECT id, 'en', 'USD', 'Africa/Lagos', 'DD/MM/YYYY'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_preferences);