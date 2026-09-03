/**
 * Medical Report Routes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { upload, validateUploadedFile } = require('../middleware/uploadMiddleware');

// POST /api/upload - Upload, extract & analyze medical report
router.post('/upload', upload.single('report'), validateUploadedFile, reportController.uploadReport);

// GET /api/reports - List previous reports
router.get('/reports', reportController.getReports);

// GET /api/reports/:id - Retrieve specific report details & results
router.get('/reports/:id', reportController.getReportById);

// GET /api/reports/:id/spoken-summary - Get concise spoken audio script (English / Hindi / Hinglish)
router.get('/reports/:id/spoken-summary', reportController.getSpokenSummary);

// DELETE /api/reports/:id - Securely delete report & file
router.delete('/reports/:id', reportController.deleteReport);

module.exports = router;
