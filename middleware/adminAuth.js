const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with role check
    const users = await executeQuery(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = ?',
      [decoded.id]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Optional: Check for super admin only
const superAdminOnly = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin privileges required.' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authorization error' });
  }
};

module.exports = { adminAuth, superAdminOnly };