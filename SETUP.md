# Online Banking Website - Detailed Setup Guide

This guide provides step-by-step instructions for setting up the Online Banking Website locally.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://www.mysql.com/downloads/)
- **npm** or **yarn** (comes with Node.js)

## Installation Steps

### Step 1: Clone and Install Dependencies

```bash
cd online-banking-website
npm install
```

### Step 2: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=online_banking
DB_CONNECTION_LIMIT=10

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h

# Email Configuration (for verification and password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@onlinebanking.com

# Server Configuration
PORT=3000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 2FA Configuration
TWO_FACTOR_ISSUER=Online Banking
```

**Important**: 
- Replace `your_mysql_password` with your actual MySQL root password
- For Gmail, you'll need an [App Password](https://support.google.com/accounts/answer/185833)
- Change `JWT_SECRET` to a random string in production

### Step 3: Set Up the Database

#### Option A: Using MySQL Command Line

1. Login to MySQL:
```bash
mysql -u root -p
```

2. Run the setup script:
```sql
SOURCE path/to/database/setup.sql;
```

Or directly:
```bash
mysql -u root -p online_banking < database/setup.sql
```

#### Option B: Using the Node.js Script

Run the setup script:
```bash
npm run db:setup
```

Or:
```bash
node database/setup.js
```

### Step 4: Load Sample Data (Optional)

The setup script automatically loads sample data. If you want to load it separately:

```bash
mysql -u root -p online_banking < database/seed.sql
```

**Sample Users** (all with password: `password123`):
- john.doe@example.com
- jane.smith@example.com
- bob.wilson@example.com

### Step 5: Start the Server

```bash
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
│   ├── setup.js           # Node.js setup script
│   ├── setup-db.js        # Alternative setup script
│   └── seed.sql           # Sample data
├── middleware/
│   ├── auth.js            # JWT authentication
│   └── validation.js      # Input validation
├── public/
│   ├── index.html         # Main HTML file
│   └── js/
│       ├── api.js         # API helper functions
│       ├── auth.js        # Authentication UI
│       ├── app.js         # Main application
│       └── dashboard.js   # Dashboard functionality
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── accounts.js       # Account management
│   ├── transactions.js   # Money transfers
│   ├── bills.js          # Bill payments
│   └── profile.js        # User profile
├── .env.example          # Environment template
├── package.json          # Dependencies
├── server.js            # Main server file
└── README.md            # Project documentation
```

## Running in Different Modes

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
NODE_ENV=production npm start
```

## Testing the Application

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

### Test Get Accounts (with token)
```bash
curl -X GET http://localhost:3000/api/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Issues

### Database Connection Failed
- Ensure MySQL is running
- Check credentials in `.env`
- Make sure the database exists

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

### Email Not Sending
- For Gmail, use an App Password, not your regular password
- Check EMAIL configuration in `.env`
- In development, emails are logged to console

## Security Notes

1. **Change JWT_SECRET** in production
2. **Use HTTPS** in production
3. **Configure CORS** properly for production
4. **Enable email verification** for real deployments
5. **Set secure session cookies**
6. **Enable 2FA** for enhanced security

## API Documentation

See [README.md](README.md) for complete API endpoint documentation.

## License

MIT
