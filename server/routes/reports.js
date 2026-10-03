const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  createReport,
  getMyReports,
  getNearbyReports,
  getReportById,
  getAllReports,
  saveAiAnalysis,
} = require('../controllers/reportController');

const {
  submitVerification,
  getVerifications,
} = require('../controllers/verificationController');

const { protect, authorise } = require('../middleware/authMiddleware');

// ── File upload config (SRS FR3: Image Upload) ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, png, webp) are allowed'));
  }
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// SRS FR2 – Civic Issue Reporting
router.post('/', protect, upload.single('image'), createReport);

// SRS FR15 – Citizen Status Tracking
router.get('/my', protect, getMyReports);

// SRS FR6 – Nearby Issue Discovery
router.get('/nearby', protect, getNearbyReports);

// SRS FR2/FR15 – get specific report
router.get('/:id', protect, getReportById);

// All reports (authority / admin only)
router.get('/', protect, authorise('authority', 'admin'), getAllReports);

// SRS FR7 – save AI analysis result
router.patch('/:id/ai-analysis', protect, saveAiAnalysis);

// SRS FR10 – Community Verification
router.post('/:id/verify', protect, submitVerification);
router.get('/:id/verifications', protect, getVerifications);

module.exports = router;
