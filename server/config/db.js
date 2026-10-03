/**
 * db.js – MongoDB Atlas connection with in-memory fallback.
 * SRS NFR4: Reliability – report data persisted before submission confirmed.
 */
const mongoose = require('mongoose');

// In-memory store used when MONGO_URI is absent (demo / Vercel preview)
const inMemoryStore = {
  users: [],
  reports: [],
  verifications: [],
  statushistories: [],
};

let usingFallback = false;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('<user>')) {
    console.warn(
      '⚠️  MONGO_URI not set – running with in-memory fallback (data resets on restart).'
    );
    usingFallback = true;
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌  MongoDB connection failed: ${err.message}`);
    console.warn('⚠️  Falling back to in-memory store.');
    usingFallback = true;
  }
};

const isUsingFallback = () => usingFallback;
const getStore = () => inMemoryStore;

module.exports = { connectDB, isUsingFallback, getStore };
