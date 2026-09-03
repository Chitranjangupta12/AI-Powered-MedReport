/**
 * n8n Webhook Routes
 */

const express = require('express');
const router = express.Router();
const n8nController = require('../controllers/n8nController');

// POST /api/n8n/webhook - Inbound callback from n8n
router.post('/webhook', n8nController.handleWebhook);

module.exports = router;
