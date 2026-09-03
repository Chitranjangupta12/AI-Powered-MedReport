/**
 * Centralized Environment Configuration
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config(); // also fallback to local .env in backend if present

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medical_ai_db',
  USE_POSTGRES: process.env.USE_POSTGRES === 'true',

  // n8n Webhook Configuration
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/medical-report-agent',
  N8N_API_KEY: process.env.N8N_API_KEY || '',
  N8N_TIMEOUT_MS: parseInt(process.env.N8N_TIMEOUT_MS || '60000', 10),

  // LLM & Embedding Configuration
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'openai',
  LLM_API_KEY: process.env.LLM_API_KEY || '',
  LLM_MODEL: process.env.LLM_MODEL || 'gpt-4o-mini',
  VISION_MODEL: process.env.VISION_MODEL || 'gpt-4o',
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || 'local',
  EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY || process.env.LLM_API_KEY || '',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',

  // RAG Retrieval Configuration
  RAG_TOP_K: parseInt(process.env.RAG_TOP_K || process.env.VECTOR_TOP_K || '3', 10),
  RAG_SIMILARITY_THRESHOLD: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || process.env.VECTOR_SIMILARITY_THRESHOLD || '0.65'),
  RAG_CHUNK_SIZE: parseInt(process.env.RAG_CHUNK_SIZE || '500', 10),
  RAG_CHUNK_OVERLAP: parseInt(process.env.RAG_CHUNK_OVERLAP || '80', 10),

  // Security & Uploads
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
  UPLOAD_DIR: path.join(__dirname, '../../uploads'),
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
};
