/**
 * System Health & Status Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const env = require('../config/env');

// GET /api/health - Check service availability
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Agentic AI Medical Report Understanding Backend',
    database: {
      type: db.isPostgresConnected() ? 'PostgreSQL (pgvector)' : 'Standalone Resilient Store',
      connected: true
    },
    n8n_integration: {
      webhook_configured: !!env.N8N_WEBHOOK_URL,
      url: env.N8N_WEBHOOK_URL
    },
    safety_guardrails: 'active'
  });
});

module.exports = router;
