/**
 * Resilient Database Layer
 * Supports PostgreSQL with pgvector, and seamlessly provides
 * an in-memory/JSON store fallback for local standalone development.
 */

const env = require('./env');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

let pool = null;
let isPostgresConnected = false;

// Standalone in-memory fallback stores
const memoryStore = {
  reports: new Map(),
  report_results: new Map(),
  conversations: new Map(),
  messages: new Map()
};

async function initDb() {
  if (env.USE_POSTGRES && env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pool = new Pool({
        connectionString: env.DATABASE_URL,
        connectionTimeoutMillis: 3000
      });
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      isPostgresConnected = true;
      logger.info('Connected successfully to PostgreSQL database.');
    } catch (err) {
      logger.warn(`PostgreSQL unavailable (${err.message}). Falling back to local standalone store.`);
      isPostgresConnected = false;
      pool = null;
    }
  } else {
    logger.info('Running in resilient standalone store mode.');
  }
}

const db = {
  isPostgresConnected: () => isPostgresConnected,

  // --- Reports ---
  async saveReport(reportData) {
    const id = reportData.id || uuidv4();
    const record = {
      id,
      user_id: reportData.user_id || null,
      original_filename: reportData.original_filename,
      stored_filename: reportData.stored_filename,
      file_type: reportData.file_type,
      file_size_bytes: reportData.file_size_bytes,
      file_path: reportData.file_path,
      status: reportData.status || 'uploaded',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isPostgresConnected) {
      const query = `
        INSERT INTO reports (id, user_id, original_filename, stored_filename, file_type, file_size_bytes, file_path, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const res = await pool.query(query, [
        record.id, record.user_id, record.original_filename,
        record.stored_filename, record.file_type, record.file_size_bytes,
        record.file_path, record.status
      ]);
      return res.rows[0];
    } else {
      memoryStore.reports.set(id, record);
      return record;
    }
  },

  async getReport(id) {
    if (isPostgresConnected) {
      const res = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    return memoryStore.reports.get(id) || null;
  },

  async getAllReports() {
    if (isPostgresConnected) {
      const res = await pool.query('SELECT * FROM reports WHERE status != $1 ORDER BY created_at DESC', ['deleted']);
      return res.rows;
    }
    return Array.from(memoryStore.reports.values())
      .filter(r => r.status !== 'deleted')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async updateReportStatus(id, status, errorMessage = null) {
    if (isPostgresConnected) {
      const res = await pool.query(
        'UPDATE reports SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [status, errorMessage, id]
      );
      return res.rows[0];
    }
    const report = memoryStore.reports.get(id);
    if (report) {
      report.status = status;
      report.error_message = errorMessage;
      report.updated_at = new Date().toISOString();
      memoryStore.reports.set(id, report);
      return report;
    }
    return null;
  },

  async deleteReport(id) {
    if (isPostgresConnected) {
      await pool.query('UPDATE reports SET status = $1 WHERE id = $2', ['deleted', id]);
      return true;
    }
    const report = memoryStore.reports.get(id);
    if (report) {
      report.status = 'deleted';
      return true;
    }
    return false;
  },

  // --- Report Results ---
  async saveReportResult(resultData) {
    const id = resultData.id || uuidv4();
    const record = {
      id,
      report_id: resultData.report_id,
      report_type: resultData.report_type || 'General Laboratory Report',
      extracted_data: resultData.extracted_data || [],
      important_findings: resultData.important_findings || [],
      normal_findings: resultData.normal_findings || [],
      abnormal_findings: resultData.abnormal_findings || [],
      possible_significance: resultData.possible_significance || [],
      general_guidance: resultData.general_guidance || [],
      questions_for_doctor: resultData.questions_for_doctor || [],
      urgency: resultData.urgency || 'informational',
      urgency_category: resultData.urgency_category || 'GREEN',
      limitations: resultData.limitations || [],
      sources: resultData.sources || [],
      raw_ocr_text: resultData.raw_ocr_text || '',
      document_category: resultData.document_category || 'LABORATORY',
      structured_report: resultData.structured_report || null,
      uncertain_fields: resultData.uncertain_fields || [],
      debug_trace: resultData.debug_trace || null,
      created_at: new Date().toISOString()
    };

    if (isPostgresConnected) {
      const query = `
        INSERT INTO report_results (
          id, report_id, report_type, extracted_data, important_findings,
          normal_findings, abnormal_findings, possible_significance,
          general_guidance, questions_for_doctor, urgency, urgency_category,
          limitations, sources, raw_ocr_text
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (report_id) DO UPDATE SET
          report_type = EXCLUDED.report_type,
          extracted_data = EXCLUDED.extracted_data,
          important_findings = EXCLUDED.important_findings,
          normal_findings = EXCLUDED.normal_findings,
          abnormal_findings = EXCLUDED.abnormal_findings,
          possible_significance = EXCLUDED.possible_significance,
          general_guidance = EXCLUDED.general_guidance,
          questions_for_doctor = EXCLUDED.questions_for_doctor,
          urgency = EXCLUDED.urgency,
          urgency_category = EXCLUDED.urgency_category,
          limitations = EXCLUDED.limitations,
          sources = EXCLUDED.sources,
          raw_ocr_text = EXCLUDED.raw_ocr_text
        RETURNING *;
      `;
      const res = await pool.query(query, [
        record.id, record.report_id, record.report_type,
        JSON.stringify(record.extracted_data),
        JSON.stringify(record.important_findings),
        JSON.stringify(record.normal_findings),
        JSON.stringify(record.abnormal_findings),
        JSON.stringify(record.possible_significance),
        JSON.stringify(record.general_guidance),
        JSON.stringify(record.questions_for_doctor),
        record.urgency, record.urgency_category,
        JSON.stringify(record.limitations),
        JSON.stringify(record.sources),
        record.raw_ocr_text
      ]);
      return res.rows[0];
    } else {
      memoryStore.report_results.set(resultData.report_id, record);
      return record;
    }
  },

  async getReportResult(reportId) {
    if (isPostgresConnected) {
      const res = await pool.query('SELECT * FROM report_results WHERE report_id = $1', [reportId]);
      return res.rows[0] || null;
    }
    return memoryStore.report_results.get(reportId) || null;
  },

  // --- Conversations & Messages ---
  async getOrCreateConversation(reportId, userId = null) {
    if (isPostgresConnected) {
      const existing = await pool.query('SELECT * FROM conversations WHERE report_id = $1 LIMIT 1', [reportId]);
      if (existing.rows.length > 0) return existing.rows[0];

      const newId = uuidv4();
      const insert = await pool.query(
        'INSERT INTO conversations (id, report_id, user_id, title) VALUES ($1, $2, $3, $4) RETURNING *',
        [newId, reportId, userId, 'Medical Report Consultation']
      );
      return insert.rows[0];
    } else {
      for (const conv of memoryStore.conversations.values()) {
        if (conv.report_id === reportId) return conv;
      }
      const newConv = {
        id: uuidv4(),
        report_id: reportId,
        user_id: userId,
        title: 'Medical Report Consultation',
        created_at: new Date().toISOString()
      };
      memoryStore.conversations.set(newConv.id, newConv);
      return newConv;
    }
  },

  async saveMessage(conversationId, sender, role, content, structuredData = null) {
    const record = {
      id: uuidv4(),
      conversation_id: conversationId,
      sender,
      role,
      content,
      structured_data: structuredData,
      created_at: new Date().toISOString()
    };

    if (isPostgresConnected) {
      const query = `
        INSERT INTO messages (id, conversation_id, sender, role, content, structured_data)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const res = await pool.query(query, [
        record.id, record.conversation_id, record.sender,
        record.role, record.content, JSON.stringify(record.structured_data)
      ]);
      return res.rows[0];
    } else {
      if (!memoryStore.messages.has(conversationId)) {
        memoryStore.messages.set(conversationId, []);
      }
      memoryStore.messages.get(conversationId).push(record);
      return record;
    }
  },

  async getMessages(conversationId) {
    if (isPostgresConnected) {
      const res = await pool.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      );
      return res.rows;
    }
    return memoryStore.messages.get(conversationId) || [];
  },

  async getAllConversations() {
    if (isPostgresConnected) {
      const res = await pool.query(`
        SELECT c.*, r.original_filename, rr.urgency_category,
          (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
        FROM conversations c
        LEFT JOIN reports r ON c.report_id = r.id
        LEFT JOIN report_results rr ON c.report_id = rr.report_id
        ORDER BY c.created_at DESC
      `);
      return res.rows;
    }
    const convs = Array.from(memoryStore.conversations.values()).map(c => {
      const report = memoryStore.reports.get(c.report_id);
      const result = memoryStore.report_results.get(c.report_id);
      const msgs = memoryStore.messages.get(c.id) || [];
      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1].content : null;

      return {
        ...c,
        original_filename: report ? report.original_filename : 'Report',
        urgency_category: result ? result.urgency_category : 'GREEN',
        last_message: lastMessage
      };
    });
    return convs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
};

module.exports = { db, initDb };
