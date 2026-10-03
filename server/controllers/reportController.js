/**
 * reportController.js
 * SRS FR2: Civic Issue Reporting
 * SRS FR3: Image Upload
 * SRS FR4: GPS and Location Capture
 * SRS FR6: Nearby Issue Discovery
 * SRS FR8: Duplicate Report Detection (flagging via AI)
 * SRS FR15: Citizen Status Tracking
 */
const { isUsingFallback, getStore } = require('../config/db');

// ── fallback id helper ────────────────────────────────────────────────────────
let _rid = 2000;
const nextId = () => String(++_rid);

// ── DB abstraction ────────────────────────────────────────────────────────────
const getReport = async (id) => {
  if (isUsingFallback()) return getStore().reports.find((r) => r._id === id) || null;
  const Report = require('../models/Report');
  return Report.findById(id).populate('user', 'name email').populate('assignedTo', 'name department');
};

// ── @POST /api/reports  (SRS FR2) ────────────────────────────────────────────
exports.createReport = async (req, res, next) => {
  try {
    const { category, description, latitude, longitude, address } = req.body;

    if (!category || !description || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Category, description and location are required' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl || null;
    const userId = req.user._id || req.user.id;

    let report;

    if (isUsingFallback()) {
      report = {
        _id: nextId(),
        user: userId,
        category,
        description,
        imageUrl,
        location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
        address: address || '',
        status: 'submitted',
        aiAnalysis: {},
        assignedDepartment: null,
        resolutionNotes: null,
        verificationCount: 0,
        communityVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      getStore().reports.push(report);
    } else {
      const Report = require('../models/Report');
      report = await Report.create({
        user: userId,
        category,
        description,
        imageUrl,
        location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
        address: address || '',
      });
    }

    res.status(201).json({ success: true, message: 'Report submitted successfully', data: report });
  } catch (err) {
    next(err);
  }
};

// ── @GET /api/reports/my  (SRS FR15: Citizen Status Tracking) ────────────────
exports.getMyReports = async (req, res, next) => {
  try {
    const userId = String(req.user._id || req.user.id);
    let reports;

    if (isUsingFallback()) {
      reports = getStore().reports.filter((r) => String(r.user) === userId);
    } else {
      const Report = require('../models/Report');
      reports = await Report.find({ user: userId }).sort({ createdAt: -1 });
    }

    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

// ── @GET /api/reports/nearby  (SRS FR6) ──────────────────────────────────────
exports.getNearbyReports = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.query; // radius in metres

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    let reports;

    if (isUsingFallback()) {
      // Simple Haversine-ish filter for fallback
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const R = parseFloat(radius);
      reports = getStore().reports.filter((r) => {
        if (!r.location?.coordinates) return false;
        const [rLng, rLat] = r.location.coordinates;
        const dLat = (rLat - lat) * (Math.PI / 180);
        const dLng = (rLng - lng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat * (Math.PI / 180)) * Math.cos(rLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
        const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return dist <= R;
      });
    } else {
      const Report = require('../models/Report');
      reports = await Report.find({
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
            $maxDistance: parseFloat(radius),
          },
        },
        status: { $ne: 'resolved' },
      }).limit(50);
    }

    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
};

// ── @GET /api/reports/:id  ────────────────────────────────────────────────────
exports.getReportById = async (req, res, next) => {
  try {
    const report = await getReport(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

// ── @GET /api/reports  (all – authority / admin) ──────────────────────────────
exports.getAllReports = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let reports, total;

    if (isUsingFallback()) {
      let list = getStore().reports;
      if (status) list = list.filter((r) => r.status === status);
      if (category) list = list.filter((r) => r.category === category);
      total = list.length;
      reports = list.slice(skip, skip + parseInt(limit));
    } else {
      const Report = require('../models/Report');
      const filter = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      [reports, total] = await Promise.all([
        Report.find(filter)
          .populate('user', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Report.countDocuments(filter),
      ]);
    }

    res.json({
      success: true,
      data: reports,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ── @PATCH /api/reports/:id/ai-analysis  (SRS FR7) ───────────────────────────
exports.saveAiAnalysis = async (req, res, next) => {
  try {
    const { aiAnalysis } = req.body;

    if (isUsingFallback()) {
      const store = getStore();
      const idx = store.reports.findIndex((r) => r._id === req.params.id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Report not found' });
      store.reports[idx].aiAnalysis = { ...aiAnalysis, analysedAt: new Date() };
      return res.json({ success: true, data: store.reports[idx] });
    }

    const Report = require('../models/Report');
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { aiAnalysis: { ...aiAnalysis, analysedAt: new Date() } },
      { new: true }
    );
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};
