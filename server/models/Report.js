/**
 * Report.js – SRS §6.2 Issue Report Data
 * Fields: Report ID, User ID, Issue category, Description, Image reference,
 *         Latitude, Longitude, Address, Submission timestamp, Current status,
 *         Verification info, AI analysis result, Assigned department, Resolution info.
 *
 * Status lifecycle (SRS §3.13):
 *   submitted → under_review → verified → assigned → in_progress → resolved
 */
const mongoose = require('mongoose');

const CATEGORIES = [
  'Roads and Infrastructure',
  'Electricity',
  'Water Supply',
  'Sanitation',
  'Public Facilities',
  'Other',
];

const STATUS_VALUES = [
  'submitted',
  'under_review',
  'verified',
  'assigned',
  'in_progress',
  'resolved',
];

const reportSchema = new mongoose.Schema(
  {
    // ---------- Core ----------
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: [true, 'Issue category is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // ---------- Evidence (SRS §3.3) ----------
    imageUrl: {
      type: String,
      default: null,
    },

    // ---------- Location (SRS §3.4 / §4.2.3) ----------
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Location coordinates are required'],
      },
    },
    address: {
      type: String,
      default: '',
    },

    // ---------- Status (SRS §3.13) ----------
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: 'submitted',
    },

    // ---------- AI Analysis (SRS §3.7) ----------
    aiAnalysis: {
      category: String,
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
      priority: { type: Number, min: 1, max: 5, default: 3 },
      isDuplicate: { type: Boolean, default: false },
      duplicateOfReport: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
      isSuspicious: { type: Boolean, default: false },
      suspiciousReason: { type: String, default: null },
      summary: { type: String, default: null },
      suggestedDepartment: { type: String, default: null },
      analysedAt: { type: Date, default: null },
    },

    // ---------- Authority fields (SRS §3.11-3.14) ----------
    assignedDepartment: {
      type: String,
      enum: [...CATEGORIES, null],
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: null,
    },
    resolutionImageUrl: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },

    // ---------- Community verification (SRS §3.10) ----------
    verificationCount: {
      type: Number,
      default: 0,
    },
    communityVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index for nearby queries (SRS §4.6 NFR6)
reportSchema.index({ location: '2dsphere' });

// Index on status + category for authority portal filters
reportSchema.index({ status: 1, category: 1 });
reportSchema.index({ user: 1 });

module.exports = mongoose.model('Report', reportSchema);
