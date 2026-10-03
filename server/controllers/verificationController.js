/**
 * verificationController.js
 * SRS FR10: Community Verification
 * Community feedback assists system and authorities in understanding whether
 * an issue appears genuine or requires further review.
 */
const { isUsingFallback, getStore } = require('../config/db');

let _vid = 3000;
const nextId = () => String(++_vid);

// ── @POST /api/reports/:id/verify  (SRS FR10) ────────────────────────────────
exports.submitVerification = async (req, res, next) => {
  try {
    const { response, comment } = req.body;
    const reportId = req.params.id;
    const userId = String(req.user._id || req.user.id);

    if (!['confirmed', 'disputed', 'not_sure'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Response must be confirmed, disputed or not_sure' });
    }

    if (isUsingFallback()) {
      const store = getStore();
      // prevent duplicate verification
      const already = store.verifications.find(
        (v) => v.report === reportId && v.user === userId
      );
      if (already) {
        return res.status(400).json({ success: false, message: 'You have already verified this report' });
      }
      const verification = { _id: nextId(), report: reportId, user: userId, response, comment: comment || null, createdAt: new Date() };
      store.verifications.push(verification);

      // Update report verification count
      const rIdx = store.reports.findIndex((r) => r._id === reportId);
      if (rIdx !== -1) {
        store.reports[rIdx].verificationCount = (store.reports[rIdx].verificationCount || 0) + 1;
        if (store.reports[rIdx].verificationCount >= 3) store.reports[rIdx].communityVerified = true;
      }
      return res.status(201).json({ success: true, message: 'Verification submitted', data: verification });
    }

    const Verification = require('../models/Verification');
    const Report = require('../models/Report');

    const existing = await Verification.findOne({ report: reportId, user: userId });
    if (existing) return res.status(400).json({ success: false, message: 'You have already verified this report' });

    const verification = await Verification.create({ report: reportId, user: userId, response, comment });

    // Increment count on report
    const count = await Verification.countDocuments({ report: reportId });
    await Report.findByIdAndUpdate(reportId, {
      verificationCount: count,
      communityVerified: count >= 3,
    });

    res.status(201).json({ success: true, message: 'Verification submitted', data: verification });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already verified this report' });
    }
    next(err);
  }
};

// ── @GET /api/reports/:id/verifications ──────────────────────────────────────
exports.getVerifications = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    let verifications;

    if (isUsingFallback()) {
      verifications = getStore().verifications.filter((v) => v.report === reportId);
    } else {
      const Verification = require('../models/Verification');
      verifications = await Verification.find({ report: reportId }).populate('user', 'name');
    }

    const summary = { confirmed: 0, disputed: 0, not_sure: 0, total: verifications.length };
    verifications.forEach((v) => { if (summary[v.response] !== undefined) summary[v.response]++; });

    res.json({ success: true, data: verifications, summary });
  } catch (err) {
    next(err);
  }
};
