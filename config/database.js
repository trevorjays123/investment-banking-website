const mysql = require('mysql2/promise');
require('dotenv').config();

// SSL configuration for cloud databases (Aiven, AWS RDS, etc.)
const getSSLConfig = () => {
  // If explicitly disabled, no SSL
  if (process.env.DB_SSL === 'false' || process.env.DB_SSL === '0') {
    console.log('🔒 SSL: Disabled (DB_SSL=false)');
    return undefined;
  }
  // Default to SSL for production/Vercel (or if DB_SSL is 'true')
  if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' || !process.env.DB_SSL) {
    console.log('🔒 SSL: Enabled for production');
    return {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    };
  }
  return undefined;
};

// Create connection pool - optimized for Vercel serverless
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'online_banking',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 2 : 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,
  ssl: getSSLConfig()
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Database:', process.env.DB_NAME);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Host:', process.env.DB_HOST || 'not set');
    console.error('   User:', process.env.DB_USER || 'not set');
    console.error('   Database:', process.env.DB_NAME || 'not set');
    return false;
  }
};

// Helper function to execute queries
// Note: pool.execute() has issues with LIMIT/OFFSET parameters, so we use pool.query()
const executeQuery = async (query, params = []) => {
  try {
    // Use pool.query instead of pool.execute to avoid LIMIT/OFFSET prepared statement issues
    const [results] = await pool.query(query, params);
    return results;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    console.error('   Query:', query.substring(0, 100));
    console.error('   Code:', error.code);
    throw error;
  }
};

// Helper function for transactions
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    connection.release();
    return result;
  } catch (error) {
    await connection.rollback();
    connection.release();
    throw error;
  }
};

module.exports = { pool, testConnection, executeQuery, transaction };
