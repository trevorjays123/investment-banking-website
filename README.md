# Online Banking Website

A complete online banking application built with Node.js, Express, MySQL, and TailwindCSS.

## Features

- **User Authentication**: Registration, login, password reset, 2FA support
- **Account Management**: Multiple account types (checking, savings, credit)
- **Money Transfers**: Secure ACID-compliant transactions
- **Bill Payments**: Payees management and scheduled payments
- **Transaction History**: Full transaction history with filters
- **Profile Management**: Update profile information and change passwords

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript, TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Security**: JWT, bcrypt, helmet, rate limiting

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation Steps

### 1. Clone and Install Dependencies

```
bash
cd online-banking-website
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your settings:

```
bash
cp .env.example .env
```

Edit `.env` with your database and email credentials:

```
env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=online_banking
DB_CONNECTION_LIMIT=10

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Email (for verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@onlinebanking.com

# Server
PORT=3000
NODE_ENV=development
```

### 3. Set Up Database

Create the database and tables:

```
bash
# Login to MySQL
mysql -u root -p

# Run the setup script
source database/setup.sql
```

Or run the SQL commands manually:

```
bash
mysql -u root -p online_banking < database/setup.sql
```

### 4. Load Sample Data (Optional)

```
bash
mysql -u root -p online_banking < database/Sample users (password: `password123`):
-seed.sql
```

 john.doe@example.com
- jane.smith@example.com
- bob.wilson@example.com

### 5. Start the Server

```
bash
npm start
```

The application will be available at `http://localhost:3000`

## Project Structure

```
online-banking-website/
├── config/
│   └── database.js         # Database configuration
├── database/
│   ├── setup.sql          # Database schema
│   ├── seed.sql           # Sample data
│   └── indexes.sql        # Performance indexes
├── public/
│   ├── index.html         # Main HTML file
│   └── js/
│       ├── api.js         # API helper
│       ├── auth.js        # Authentication
│       ├── app.js         # Main app
│       └── dashboard.js   # Dashboard
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── accounts.js       # Account management
│   ├── transactions.js   # Money transfers
│   ├── bills.js          # Bill payments
│   └── profile.js        # Profile management
├── .env.example          # Environment template
├── package.json          # Dependencies
├── server.js            # Main server file
└── README.md            # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Accounts
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/:id` - Get account details
- `GET /api/accounts/:id/transactions` - Get account transactions
- `POST /api/accounts` - Create new account

### Transactions
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions/transfer` - Money transfer
- `POST /api/transactions/deposit` - Deposit money
- `POST /api/transactions/withdraw` - Withdraw money

### Bills
- `GET /api/bills/payees` - Get payees
- `POST /api/bills/payees` - Add payee
- `GET /api/bills/payments` - Get payments
- `POST /api/bills/payments` - Schedule payment

### Profile
- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `PUT /api/profile/password` - Change password

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting to prevent brute force
- SQL injection prevention (parameterized queries)
- CORS configuration
- Helmet for security headers
- ACID-compliant transactions

## Database Optimization

The setup.sql includes indexes for:
- User email lookups
- Account number searches
- Transaction date ranges
- Foreign key relationships

## License

MIT
