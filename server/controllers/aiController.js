/**
 * aiController.js
 * SRS FR7:  AI-Assisted Issue Analysis
 * SRS FR8:  Duplicate Report Detection
 * SRS FR9:  Suspicious Report Verification
 * SRS FR16: AI Assistant
 *
 * Rule-based mock AI – no API key required. Returns structured JSON.
 * 800 ms simulated delay to mimic real AI latency.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── keyword maps for classification ──────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  'Roads and Infrastructure': ['pothole', 'road', 'crack', 'pavement', 'footpath', 'bridge', 'traffic', 'signal', 'broken road', 'construction'],
  Electricity: ['light', 'street light', 'power', 'electric', 'wire', 'pole', 'outage', 'transformer', 'dark'],
  'Water Supply': ['water', 'pipe', 'leak', 'flood', 'drainage', 'sewage', 'burst', 'tap', 'supply'],
  Sanitation: ['garbage', 'trash', 'waste', 'dump', 'smell', 'dirty', 'clean', 'litter', 'hygiene'],
  'Public Facilities': ['park', 'bench', 'toilet', 'restroom', 'playground', 'school', 'hospital', 'bus stop', 'public'],
};

const SEVERITY_KEYWORDS = {
  critical: ['fire', 'accident', 'emergency', 'gas leak', 'collapse', 'flood', 'unsafe', 'danger', 'hazard'],
  high: ['major', 'serious', 'broken', 'damaged', 'blocked', 'fallen', 'burst'],
  medium: ['issue', 'problem', 'repair', 'crack', 'leaking', 'not working'],
  low: ['minor', 'small', 'suggestion', 'request', 'maintenance'],
};

const SUSPICIOUS_PATTERNS = ['free money', 'advertisement', 'buy', 'sell', 'click here', 'whatsapp', 'call me', 'visit us'];

const classifyCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return cat;
  }
  return 'Other';
};

const getSeverity = (text) => {
  const lower = text.toLowerCase();
  for (const [sev, words] of Object.entries(SEVERITY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return sev;
  }
  return 'medium';
};

const checkSuspicious = (text) => {
  const lower = text.toLowerCase();
  return SUSPICIOUS_PATTERNS.some((p) => lower.includes(p));
};

const getPriority = (severity) => ({ critical: 5, high: 4, medium: 3, low: 2 }[severity] || 3);

// ── @POST /api/ai/analyse  (SRS FR7) ─────────────────────────────────────────
exports.analyseReport = async (req, res, next) => {
  try {
    const { description, category, reportId } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'description is required' });

    await sleep(800); // simulate AI latency

    const detectedCategory = classifyCategory(description);
    const severity = getSeverity(description);
    const isSuspicious = checkSuspicious(description);
    const priority = getPriority(severity);

    // Duplicate check – look for reports with same category in store / DB
    let isDuplicate = false;
    let duplicateOfReport = null;

    if (!require('../config/db').isUsingFallback()) {
      const Report = require('../models/Report');
      // Simple text-similarity: same category reported in last 24h within 500m
      const similar = await Report.findOne({
        category: detectedCategory,
        _id: { $ne: reportId },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: { $ne: 'resolved' },
      });
      if (similar) { isDuplicate = true; duplicateOfReport = similar._id; }
    } else {
      const store = require('../config/db').getStore();
      const recent = store.reports.find(
        (r) =>
          r.category === detectedCategory &&
          r._id !== reportId &&
          new Date() - new Date(r.createdAt) < 24 * 60 * 60 * 1000
      );
      if (recent) { isDuplicate = true; duplicateOfReport = recent._id; }
    }

    const summary = `This appears to be a ${severity}-severity ${detectedCategory} issue. ${
      isDuplicate ? 'A similar report was found recently – possible duplicate.' : ''
    }${isSuspicious ? ' ⚠️ Report content appears suspicious.' : ''}`;

    const analysis = {
      category: detectedCategory,
      severity,
      priority,
      isDuplicate,
      duplicateOfReport,
      isSuspicious,
      suspiciousReason: isSuspicious ? 'Description contains promotional or off-topic content.' : null,
      suggestedDepartment: detectedCategory,
      summary,
      analysedAt: new Date(),
    };

    // Persist AI result back to report if reportId provided
    if (reportId) {
      if (!require('../config/db').isUsingFallback()) {
        const Report = require('../models/Report');
        await Report.findByIdAndUpdate(reportId, { aiAnalysis: analysis });
      } else {
        const store = require('../config/db').getStore();
        const idx = store.reports.findIndex((r) => r._id === reportId);
        if (idx !== -1) store.reports[idx].aiAnalysis = analysis;
      }
    }

    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
};

// ── @POST /api/ai/assistant  (SRS FR16: AI Assistant) ────────────────────────
exports.askAssistant = async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, message: 'question is required' });

    await sleep(800);

    const q = question.toLowerCase();
    let answer = '';

    if (q.includes('report') && (q.includes('how') || q.includes('submit'))) {
      answer = 'To report an issue: click "Report Issue" from your dashboard, select the issue category, write a description, upload a photo as evidence, and confirm your GPS location on the map. Then submit!';
    } else if (q.includes('status') || q.includes('track')) {
      answer = 'You can track your report status in "My Reports". Statuses progress from Submitted → Under Review → Verified → Assigned → In Progress → Resolved. You will see the current stage displayed clearly.';
    } else if (q.includes('category') || q.includes('type')) {
      answer = 'LocalPulse covers: Roads & Infrastructure, Electricity, Water Supply, Sanitation, and Public Facilities. Choose the category that best matches your issue.';
    } else if (q.includes('photo') || q.includes('image') || q.includes('evidence')) {
      answer = 'A photograph strengthens your report. Upload a clear image of the issue. Supported formats: JPG, PNG. Max size: 5 MB.';
    } else if (q.includes('location') || q.includes('gps') || q.includes('map')) {
      answer = 'When reporting, allow browser location access so the GPS coordinates are captured automatically. You can also confirm or adjust the pin on the map before submitting.';
    } else if (q.includes('duplicate')) {
      answer = 'Our AI automatically checks for duplicate reports. If a similar issue was already reported nearby, it will be flagged – your report is still saved but linked to the original.';
    } else if (q.includes('authority') || q.includes('resolved') || q.includes('who')) {
      answer = 'Reports are reviewed by local authority officers through the Authority Portal. They verify, assign to the relevant department, and update the status until resolution.';
    } else if (q.includes('community') || q.includes('verify') || q.includes('confirm')) {
      answer = 'Nearby citizens can confirm whether an issue is genuine by tapping "Confirm" on a report. Once 3+ users confirm it, the report is marked community-verified.';
    } else {
      answer = 'I am here to help with LocalPulse. You can ask me: how to report an issue, how statuses work, what categories exist, how to upload evidence, or how community verification works.';
    }

    res.json({ success: true, data: { question, answer, timestamp: new Date() } });
  } catch (err) {
    next(err);
  }
};
