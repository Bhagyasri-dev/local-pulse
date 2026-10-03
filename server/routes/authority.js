const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const {
  getDashboardReports,
  updateStatus,
  assignReport,
  resolveReport,
  getStatusHistory,
} = require('../controllers/authorityController');

const { protect, authorise } = require('../middleware/authMiddleware');

// Restrict entire router to authority + admin (SRS FR11)
router.use(protect, authorise('authority', 'admin'));

// Upload for resolution evidence (SRS FR14)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Images only'));
  },
});

// SRS FR11: Authority Portal dashboard
router.get('/reports', getDashboardReports);

// SRS FR13: Issue Status Management
router.patch('/reports/:id/status', updateStatus);

// SRS FR12: Issue Assignment
router.patch('/reports/:id/assign', assignReport);

// SRS FR14: Resolution Management
router.patch('/reports/:id/resolve', upload.single('resolutionImage'), resolveReport);

// SRS FR13: Status history with timestamps
router.get('/reports/:id/history', getStatusHistory);

module.exports = router;
