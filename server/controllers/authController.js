/**
 * authController.js
 * SRS FR1: User Registration and Authentication
 * - Register, Login, Get current user profile
 * Handles both MongoDB Atlas and in-memory fallback.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { isUsingFallback, getStore } = require('../config/db');

// ── helpers ──────────────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'localpulse_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id || user.id);
  const safe = {
    _id: user._id || user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || null,
    createdAt: user.createdAt,
  };
  res.status(statusCode).json({ success: true, token, user: safe });
};

// ── fallback store helpers ───────────────────────────────────────────────────
let _idCounter = 1000;
const nextId = () => String(++_idCounter);

const storeRegister = async ({ name, email, password, role, department }) => {
  const store = getStore();
  if (store.users.find((u) => u.email === email)) {
    const err = new Error('Email already exists'); err.statusCode = 400; throw err;
  }
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = {
    _id: nextId(), id: nextId(), name, email,
    password: hash, role: role || 'citizen',
    department: department || null, createdAt: new Date(),
  };
  store.users.push(user);
  return user;
};

const storeLogin = async (email, password) => {
  const store = getStore();
  const user = store.users.find((u) => u.email === email);
  if (!user) { const e = new Error('Invalid credentials'); e.statusCode = 401; throw e; }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) { const e = new Error('Invalid credentials'); e.statusCode = 401; throw e; }
  return user;
};

exports.seedDemoAccounts = async () => {
  const demoUsers = [
    { name: 'Demo Citizen', email: 'citizen@demo.com', password: 'demo123', role: 'citizen' },
    { name: 'Demo Authority', email: 'authority@localpulse.org', password: 'demo123', role: 'authority' },
  ];

  if (isUsingFallback()) {
    const store = getStore();
    for (const demoUser of demoUsers) {
      if (!store.users.some((user) => user.email === demoUser.email)) {
        await storeRegister(demoUser);
      }
    }
    return;
  }

  const User = require('../models/User');
  for (const demoUser of demoUsers) {
    if (!(await User.exists({ email: demoUser.email }))) {
      await User.create(demoUser);
    }
  }
};

// ── @POST /api/auth/register  (SRS FR1) ──────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const registrationRole = 'citizen';
    let user;

if (isUsingFallback()) {
  user = await storeRegister({
    name,
    email,
    password,
    role: registrationRole,
  });
} else {
  const User = require('../models/User');

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({
      success: false,
      message: 'Email already registered',
    });
  }

  user = await User.create({
    name,
    email,
    password,
    role: registrationRole,
  });
}

    sendToken(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── @POST /api/auth/login  (SRS FR1) ─────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let user;
    if (isUsingFallback()) {
      user = await storeLogin(email, password);
    } else {
      const User = require('../models/User');
      user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    sendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── @GET /api/auth/me  (SRS FR1) ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      _id: u._id || u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department || null,
      createdAt: u.createdAt,
    },
  });
};
