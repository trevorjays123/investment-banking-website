# Complete Setup Guide for Apex Capital Online Banking Website

This guide provides step-by-step instructions to set up and run your online banking website with proper CSS styling.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Installation](#2-installation)
3. [TailwindCSS Setup](#3-tailwindcss-setup)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Setup](#5-database-setup)
6. [Building CSS](#6-building-css)
7. [Running the Application](#7-running-the-application)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

Ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MySQL** (v8 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)
- **npm** (comes with Node.js)

Verify installations:
```bash
node --version
npm --version
mysql --version
```

---

## 2. Installation

### Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- express (web framework)
- mysql2 (database)
- bcrypt (password hashing)
- jsonwebtoken (authentication)
- tailwindcss (CSS framework)
- nodemailer (email service)

---

## 3. TailwindCSS Setup

### tailwind.config.js

Your project already has this file. It should look like this:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./public/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a56db',
          dark: '#1e40af',
          light: '#3b82f6'
        },
        gold: {
          DEFAULT: '#d4a853',
          light: '#f0c674',
          dark: '#b8923f'
        },
        dark: {
          DEFAULT: '#0a192f',
          secondary: '#112240'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'serif']
      }
    },
  },
  plugins: [],
}
```

### src/input.css

This file contains TailwindCSS directives and custom styles. It's already set up.

---

## 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3005
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=online_banking
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@apexcapital.com
EMAIL_FROM_NAME=Apex Capital

# Frontend URL
BASE_URL=http://localhost:3005

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 5. Database Setup

### Step 1: Create MySQL Database

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE online_banking;

# Exit MySQL
exit;
```

### Step 2: Run Database Setup

```bash
npm run db:setup
```

This creates all necessary tables:
- users
- accounts
- transactions
- payees
- bill_payments
- investments
- admin_audit_logs
- platform_revenue

### Step 3: (Optional) Seed Sample Data

```bash
npm run db:seed
```

---

## 6. Building CSS

### One-time Build

```bash
npm run build:css
```

### Watch Mode (Development)

```bash
npm run build:css:watch
```

This will:
1. Read `src/input.css`
2. Process TailwindCSS directives
3. Generate `public/css/styles.css`

**Important:** Always run this after making changes to styles!

---

## 7. Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Access the Application

- **Landing Page:** http://localhost:3005
- **Dashboard:** http://localhost:3005/dashboard.html
- **Admin Panel:** http://localhost:3005/admin

---

## 8. Troubleshooting

### CSS Not Loading

1. **Rebuild TailwindCSS:**
   ```bash
   npm run build:css
   ```

2. **Clear browser cache:** Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Check if styles.css exists:**
   ```bash
   # Windows
   dir public\css\styles.css
   
   # Mac/Linux
   ls -la public/css/styles.css
   ```

4. **Verify file size:**
   ```bash
   node -e "const fs = require('fs'); const c = fs.readFileSync('public/css/styles.css', 'utf8'); console.log('Size:', c.length, 'bytes');"
   ```
   Should be ~40,000+ bytes

### Database Connection Failed

1. Verify MySQL is running
2. Check `.env` credentials
3. Ensure database exists:
   ```sql
   SHOW DATABASES LIKE 'online_banking';
   ```

### Login Not Working

1. Check if user exists in database
2. Verify password is correct
3. Check browser console for errors

---

## Project Structure

```
Investment Banking website/
├── config/
│   └── database.js          # Database connection pool
├── database/
│   ├── setup.sql            # Table definitions
│   ├── seed.sql             # Sample data
│   └── setup-db.js          # Setup script
├── middleware/
│   ├── auth.js              # JWT authentication
│   └── validation.js        # Input validation
├── public/
│   ├── css/
│   │   └── styles.css       # Compiled CSS (generated)
│   ├── js/
│   │   ├── api.js           # API helper module
│   │   ├── auth.js          # Authentication module
│   │   ├── app.js           # Main application
│   │   ├── dashboard.js     # Dashboard functionality
│   │   ├── admin.js         # Admin panel
│   │   └── landing.js       # Landing page
│   ├── index.html           # Landing page
│   ├── dashboard.html       # User dashboard
│   └── admin.html           # Admin panel
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── accounts.js          # Account routes
│   ├── transactions.js      # Transaction routes
│   ├── bills.js             # Bill payment routes
│   ├── profile.js           # Profile routes
│   └── admin.js             # Admin routes
├── services/
│   └── email.js             # Email service
├── src/
│   └── input.css            # TailwindCSS source
├── .env                     # Environment variables
├── package.json             # Dependencies
├── server.js                # Express server
└── tailwind.config.js       # TailwindCSS config
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Accounts
- `GET /api/accounts` - Get user accounts
- `GET /api/accounts/:id` - Get account details
- `GET /api/accounts/:id/transactions` - Get transactions
- `POST /api/accounts` - Create new account

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions/transfer` - Transfer money
- `POST /api/transactions/deposit` - Deposit money
- `POST /api/transactions/withdraw` - Withdraw money

### Bills
- `GET /api/bills/payees` - Get payees
- `POST /api/bills/payees` - Add payee
- `GET /api/bills/payments` - Get payments
- `POST /api/bills/payments` - Schedule payment

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `PUT /api/profile/password` - Change password

---

## Support

If you encounter issues:

1. Check the console output for errors
2. Verify all environment variables are set
3. Ensure MySQL is running
4. Run `npm run build:css` to rebuild styles
5. Clear browser cache and refresh