/**
 * authMiddleware.js
 * SRS §4.2 NFR2 Security – Protected routes require authentication.
 * SRS §1.3 – JWT: JSON Web Token used for auth.
 */
const jwt = require('jsonwebtoken');
const { isUsingFallback, getStore } = require('../config/db');

// Lazy-load User model only when MongoDB is available
const getUser = async (id) => {
  if (isUsingFallback()) {
    return getStore().users.find((u) => u._id === id) || null;
  }
  const User = require('../models/User');
  return User.findById(id).select('-password');
};

// ─── Verify JWT ─────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: 'Not authorised – no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'localpulse_secret');
    req.user = await getUser(decoded.id);

    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: 'User no longer exists' });
    }

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: 'Token is invalid or expired' });
  }
};

// ─── Role guard (SRS §2.3) ───────────────────────────────────────────────────
const authorise = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not permitted to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorise };
