/**
 * StatusHistory.js – SRS §6.4 Status Data
 * Fields: Current status, Previous status, Status timestamp,
 *         Authority user responsible, Optional status remarks
 * SRS §3.13 FR13: Issue Status Management
 */
const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      required: true,
    },
    previousStatus: {
      type: String,
      default: null,
    },
    newStatus: {
      type: String,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
      default: null,
    },
  },
  { timestamps: true }
);

statusHistorySchema.index({ report: 1 });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
