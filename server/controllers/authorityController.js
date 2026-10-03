/**
 * authorityController.js
 * SRS FR11: Authority Portal
 * SRS FR12: Issue Assignment
 * SRS FR13: Issue Status Management
 * SRS FR14: Resolution Management
 * Only accessible by users with role = 'authority' or 'admin'
 */
const { isUsingFallback, getStore } = require('../config/db');

let _shid = 4000;
const nextId = () => String(++_shid);

const VALID_STATUSES = ['submitted', 'under_review', 'verified', 'assigned', 'in_progress', 'resolved'];
const DEPARTMENTS = ['Roads and Infrastructure', 'Electricity', 'Water Supply', 'Sanitation', 'Public Facilities', 'Other'];

// ── helper: record status change ─────────────────────────────────────────────
const recordStatusChange = async ({ reportId, previousStatus, newStatus, changedById, remarks }) => {
  if (isUsingFallback()) {
    getStore().statushistories.push({
      _id: nextId(), report: reportId, previousStatus, newStatus,
      changedBy: changedById, remarks: remarks || null, createdAt: new Date(),
    });
    return;
  }
  const StatusHistory = require('../models/StatusHistory');
  await StatusHistory.create({ report: reportId, previousStatus, newStatus, changedBy: changedById, remarks });
};

// ── @GET /api/authority/reports  (SRS FR11 – dashboard summary) ───────────────
exports.getDashboardReports = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let reports, total, stats;

    if (isUsingFallback()) {
      let list = [...getStore().reports];
      if (status) list = list.filter((r) => r.status === status);
      if (category) list = list.filter((r) => r.category === category);
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      total = list.length;
      reports = list.slice(skip, skip + parseInt(limit));

      // quick stats
      const all = getStore().reports;
      stats = {
        total: all.length,
        submitted: all.filter((r) => r.status === 'submitted').length,
        under_review: all.filter((r) => r.status === 'under_review').length,
        verified: all.filter((r) => r.status === 'verified').length,
        assigned: all.filter((r) => r.status === 'assigned').length,
        in_progress: all.filter((r) => r.status === 'in_progress').length,
        resolved: all.filter((r) => r.status === 'resolved').length,
        suspicious: all.filter((r) => r.aiAnalysis?.isSuspicious).length,
        duplicates: all.filter((r) => r.aiAnalysis?.isDuplicate).length,
      };
    } else {
      const Report = require('../models/Report');
      const filter = {};
      if (status) filter.status = status;
      if (category) filter.category = category;

      [reports, total] = await Promise.all([
        Report.find(filter)
          .populate('user', 'name email')
          .populate('assignedTo', 'name department')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Report.countDocuments(filter),
      ]);

      const allStats = await Report.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      stats = { total: 0 };
      allStats.forEach(({ _id, count }) => { stats[_id] = count; stats.total += count; });
      const suspicious = await Report.countDocuments({ 'aiAnalysis.isSuspicious': true });
      const duplicates = await Report.countDocuments({ 'aiAnalysis.isDuplicate': true });
      stats.suspicious = suspicious;
      stats.duplicates = duplicates;
    }

    res.json({
      success: true,
      data: reports,
      stats,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

// ── @PATCH /api/authority/reports/:id/status  (SRS FR13) ─────────────────────
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const reportId = req.params.id;
    const userId = String(req.user._id || req.user.id);

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
    }

    let report;

    if (isUsingFallback()) {
      const store = getStore();
      const idx = store.reports.findIndex((r) => r._id === reportId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Report not found' });
      const prev = store.reports[idx].status;
      store.reports[idx].status = status;
      store.reports[idx].updatedAt = new Date();
      if (status === 'resolved') store.reports[idx].resolvedAt = new Date();
      report = store.reports[idx];
      await recordStatusChange({ reportId, previousStatus: prev, newStatus: status, changedById: userId, remarks });
    } else {
      const Report = require('../models/Report');
      report = await Report.findById(reportId);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
      const prev = report.status;
      report.status = status;
      if (status === 'resolved') report.resolvedAt = new Date();
      await report.save();
      await recordStatusChange({ reportId, previousStatus: prev, newStatus: status, changedById: userId, remarks });
    }

    res.json({ success: true, message: `Status updated to '${status}'`, data: report });
  } catch (err) {
    next(err);
  }
};

// ── @PATCH /api/authority/reports/:id/assign  (SRS FR12) ─────────────────────
exports.assignReport = async (req, res, next) => {
  try {
    const { department, assignedTo } = req.body;
    const reportId = req.params.id;
    const userId = String(req.user._id || req.user.id);

    if (!department || !DEPARTMENTS.includes(department)) {
      return res.status(400).json({ success: false, message: `Invalid department. Valid: ${DEPARTMENTS.join(', ')}` });
    }

    let report;

    if (isUsingFallback()) {
      const store = getStore();
      const idx = store.reports.findIndex((r) => r._id === reportId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Report not found' });
      const prev = store.reports[idx].status;
      store.reports[idx].assignedDepartment = department;
      store.reports[idx].assignedTo = assignedTo || userId;
      store.reports[idx].status = 'assigned';
      store.reports[idx].updatedAt = new Date();
      report = store.reports[idx];
      await recordStatusChange({ reportId, previousStatus: prev, newStatus: 'assigned', changedById: userId, remarks: `Assigned to ${department}` });
    } else {
      const Report = require('../models/Report');
      report = await Report.findById(reportId);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
      const prev = report.status;
      report.assignedDepartment = department;
      report.assignedTo = assignedTo || userId;
      report.status = 'assigned';
      await report.save();
      await recordStatusChange({ reportId, previousStatus: prev, newStatus: 'assigned', changedById: userId, remarks: `Assigned to ${department}` });
    }

    res.json({ success: true, message: `Report assigned to ${department}`, data: report });
  } catch (err) {
    next(err);
  }
};

// ── @PATCH /api/authority/reports/:id/resolve  (SRS FR14) ────────────────────
exports.resolveReport = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const reportId = req.params.id;
    const userId = String(req.user._id || req.user.id);
    const resolutionImageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.resolutionImageUrl || null;

    if (!resolutionNotes) {
      return res.status(400).json({ success: false, message: 'Resolution notes are required' });
    }

    let report;

    if (isUsingFallback()) {
      const store = getStore();
      const idx = store.reports.findIndex((r) => r._id === reportId);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Report not found' });
      const prev = store.reports[idx].status;
      store.reports[idx].resolutionNotes = resolutionNotes;
      store.reports[idx].resolutionImageUrl = resolutionImageUrl;
      store.reports[idx].status = 'resolved';
      store.reports[idx].resolvedAt = new Date();
      store.reports[idx].updatedAt = new Date();
      report = store.reports[idx];
      await recordStatusChange({ reportId, previousStatus: prev, newStatus: 'resolved', changedById: userId, remarks: resolutionNotes });
    } else {
      const Report = require('../models/Report');
      report = await Report.findById(reportId);
      if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
      const prev = report.status;
      report.resolutionNotes = resolutionNotes;
      report.resolutionImageUrl = resolutionImageUrl;
      report.status = 'resolved';
      report.resolvedAt = new Date();
      await report.save();
      await recordStatusChange({ reportId, previousStatus: prev, newStatus: 'resolved', changedById: userId, remarks: resolutionNotes });
    }

    res.json({ success: true, message: 'Report marked as resolved', data: report });
  } catch (err) {
    next(err);
  }
};

// ── @GET /api/authority/reports/:id/history  (SRS FR13 – timestamps) ─────────
exports.getStatusHistory = async (req, res, next) => {
  try {
    const reportId = req.params.id;
    let history;

    if (isUsingFallback()) {
      history = getStore().statushistories.filter((h) => h.report === reportId);
    } else {
      const StatusHistory = require('../models/StatusHistory');
      history = await StatusHistory.find({ report: reportId })
        .populate('changedBy', 'name role')
        .sort({ createdAt: 1 });
    }

    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};
