/**
 * Conversational Chat Controller
 * Endpoints:
 * - POST /api/chat
 * - GET /api/conversations
 * - GET /api/conversations/:id/messages
 */

const { db } = require('../config/db');
const agentService = require('../services/agentService');
const logger = require('../utils/logger');

class ChatController {
  async sendChatMessage(req, res, next) {
    try {
      const { conversation_id, report_id, message, language = 'en', simple_mode = false } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: true,
          message: 'A non-empty user message is required.'
        });
      }

      let convId = conversation_id;
      let targetReportId = report_id;

      if (!convId && targetReportId) {
        const conv = await db.getOrCreateConversation(targetReportId);
        convId = conv.id;
      }

      if (!convId) {
        return res.status(400).json({
          error: true,
          message: 'Either conversation_id or report_id must be provided to anchor medical context.'
        });
      }

      // Fetch existing report result for context
      let reportResult = null;
      if (targetReportId) {
        reportResult = await db.getReportResult(targetReportId);
      }

      // 1. Save User Message
      await db.saveMessage(convId, 'user', 'user', message.trim());

      // 2. Fetch recent conversation history for memory
      const history = await db.getMessages(convId);

      // 3. Process via Agentic Coordinator (Safety + Memory + RAG + Tool Context + Multilingual/Simple Mode)
      const agentReply = await agentService.processChatMessage(
        message.trim(),
        reportResult,
        history,
        { language, simple_mode: Boolean(simple_mode) }
      );

      // 4. Save Assistant Response
      const savedReply = await db.saveMessage(
        convId,
        'assistant',
        'assistant',
        agentReply.content || agentReply.summary,
        agentReply
      );

      res.json({
        success: true,
        conversation_id: convId,
        message: savedReply,
        sources: agentReply.sources || [],
        urgency: agentReply.urgency || 'informational',
        urgency_category: agentReply.urgency_category || 'GREEN',
        is_emergency: !!agentReply.is_emergency,
        is_prescription_query: !!agentReply.is_prescription_query,
        rag_used: !!agentReply.rag_used,
        tools_used: agentReply.tools_used || [],
        documents_retrieved: agentReply.documents_retrieved || 0
      });
    } catch (err) {
      next(err);
    }
  }

  async getConversations(req, res, next) {
    try {
      const conversations = await db.getAllConversations();
      res.json({ success: true, conversations });
    } catch (err) {
      next(err);
    }
  }

  async getConversationMessages(req, res, next) {
    try {
      const { id } = req.params;
      const messages = await db.getMessages(id);
      res.json({ success: true, messages });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatController();
