/**
 * n8n Webhook Controller
 * Endpoint:
 * - POST /api/n8n/webhook
 */

const logger = require('../utils/logger');
const { db } = require('../config/db');

class N8nController {
  async handleWebhook(req, res, next) {
    try {
      const payload = req.body;
      logger.info('Received inbound webhook from n8n:', payload);

      if (payload.report_id && payload.result) {
        await db.saveReportResult({
          report_id: payload.report_id,
          ...payload.result
        });
        await db.updateReportStatus(payload.report_id, 'analyzed');
      }

      res.json({
        success: true,
        message: 'Webhook processed successfully.'
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new N8nController();
