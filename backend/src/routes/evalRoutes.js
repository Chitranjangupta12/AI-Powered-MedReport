/**
 * Evaluation Routes
 */

const express = require('express');
const router = express.Router();
const evalController = require('../controllers/evalController');

// GET /api/evaluations - Retrieve benchmark scores & sample dataset
router.get('/evaluations', evalController.getEvaluationBenchmark);

module.exports = router;
