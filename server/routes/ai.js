const express = require('express');
const router = express.Router();
const { analyseReport, askAssistant } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// SRS FR7: AI-Assisted Issue Analysis
router.post('/analyse', protect, analyseReport);

// SRS FR16: AI Assistant
router.post('/assistant', protect, askAssistant);

module.exports = router;
