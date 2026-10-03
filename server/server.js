/**
 * server.js – LocalPulse Express entry point
 * SRS §8.1: Development Environment – Node.js + Express.js
 * SRS §7.2: Software Interfaces – REST APIs and JSON
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const { connectDB } = require('./config/db');
const { seedDemoAccounts } = require('./controllers/authController');
const errorHandler = require('./middleware/errorHandler');

// ── ensure uploads directory exists ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── init express ──────────────────────────────────────────────────────────────
const app = express();

// ── middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── static uploads (SRS FR3: Image Upload – serve stored images) ──────────────
app.use('/uploads', express.static(uploadsDir));

// ── health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'LocalPulse API is running', timestamp: new Date() })
);

// ── routes (SRS §7.2) ────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/authority', require('./routes/authority'));
app.use('/api/ai',        require('./routes/ai'));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// ── global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  if (process.env.NODE_ENV !== 'production') await seedDemoAccounts();
  app.listen(PORT, () => {
    console.log(`🚀  LocalPulse server running on port ${PORT} – ${process.env.NODE_ENV || 'development'}`);
  });
});

module.exports = app;
