/**
 * Verification.js – SRS §6.3 Verification Data
 * Fields: Verification ID, Report ID, User ID, Verification response, Timestamp
 * SRS §3.10 FR10: Community Verification
 */
const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    response: {
      type: String,
      enum: ['confirmed', 'disputed', 'not_sure'],
      required: [true, 'Verification response is required'],
    },
    comment: {
      type: String,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      default: null,
    },
  },
  { timestamps: true }
);

// One user can verify a report only once
verificationSchema.index({ report: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Verification', verificationSchema);
