/**
 * Chatbot & Conversation Routes
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// POST /api/chat - Send a follow-up or query message
router.post('/chat', chatController.sendChatMessage);

// GET /api/conversations - List prior conversations
router.get('/conversations', chatController.getConversations);

// GET /api/conversations/:id/messages - Retrieve full message history
router.get('/conversations/:id/messages', chatController.getConversationMessages);

module.exports = router;
