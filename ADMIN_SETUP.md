# Admin Dashboard Setup Guide

The admin functionality is already implemented! This guide breaks down setup into manageable sections.

---

## ✅ Section 1: Backend Code (COMPLETE)

All backend routes are ready:
- `/routes/admin.js` - All API endpoints
- `/middleware/adminAuth.js` - Authentication middleware  
- `/public/admin.html` - Admin dashboard UI
- `/public/js/admin.js` - Frontend JavaScript

**SQL Compatibility Fixes Applied:**
- Fixed LIMIT/OFFSET parameterized queries

---

## 📋 Section 2: Database Setup

Run these SQL commands to create required tables:

```sql
-- Run the admin migration file
SOURCE database/migrations/create-admin-tables.sql;

-- Or manually create tables:
CREATE TABLE IF NOT EXISTS admin_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description VARCHAR(255),
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS investments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_id INT,
    investment_type ENUM('stocks', 'bonds', 'mutual_funds', 'fixed_deposit', 'real_estate') DEFAULT 'stocks',
    amount DECIMAL(15,2) NOT NULL,
    expected_return DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('active', 'matured', 'cancelled', 'pending') DEFAULT 'pending',
    start_date DATE NOT NULL,
    maturity_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_revenue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL UNIQUE,
    transaction_fees DECIMAL(15,2) DEFAULT 0.00,
    investment_fees DECIMAL(15,2) DEFAULT 0.00,
    service_charges DECIMAL(15,2) DEFAULT 0.00,
    interest_income DECIMAL(15,2) DEFAULT 0.00,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 👤 Section 3: Create Admin User

### Option A: Direct SQL
```sql
-- Make sure users table has 'role' column
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin', 'super_admin') DEFAULT 'user';

-- Insert admin user (password: Admin@123)
INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified, created_at)
VALUES ('Admin', 'User', 'admin@apexcapital.com', '$2b$10$YourHashedPasswordHere', 'admin', TRUE, NOW());
```

### Option B: Use Node.js Script
Run the seed script:
```bash
node database/seed-users.js
```

---

## 🚀 Section 4: Start & Test

```bash
# Install dependencies
npm install

# Start server
npm start

# Test admin login
curl -X POST http://localhost:3005/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@apexcapital.com","password":"Admin@123"}'
```

---

## 📱 Section 5: Access Admin Dashboard

1. Open browser: `http://localhost:3005/admin`
2. Login with admin credentials
3. Navigate between sections:
   - Dashboard Overview
   - User Management
   - Investments
   - Transactions
   - Revenue Analytics
   - Audit Logs

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" | Check user has role='admin' |
| "No token provided" | Login first to get JWT |
| Tables not found | Run migration SQL first |
| Pagination errors | Already fixed in routes |

---

## Quick Reference: API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/login` | POST | Admin login |
| `/api/admin/dashboard` | GET | Dashboard stats |
| `/api/admin/users` | GET | List users |
| `/api/admin/users/:id` | GET | User details |
| `/api/admin/accounts` | GET | List accounts |
| `/api/admin/transactions` | GET | List transactions |
| `/api/admin/investments` | GET | List investments |
| `/api/admin/revenue` | GET | Revenue data |
| `/api/admin/audit-logs` | GET | Audit logs |

