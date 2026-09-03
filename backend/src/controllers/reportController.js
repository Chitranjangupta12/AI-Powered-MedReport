/**
 * Medical Report Controller
 * Endpoints:
 * - POST /api/upload
 * - GET /api/reports
 * - GET /api/reports/:id
 * - DELETE /api/reports/:id
 */

const fs = require('fs');
const { db } = require('../config/db');
const ocrService = require('../services/ocrService');
const agentService = require('../services/agentService');
const logger = require('../utils/logger');

class ReportController {
  async uploadReport(req, res, next) {
    try {
      const file = req.file;
      logger.info(`Received report upload: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);

      // 1. Save Report Record in Database
      const reportRecord = await db.saveReport({
        original_filename: file.originalname,
        stored_filename: file.filename,
        file_type: file.mimetype,
        file_size_bytes: file.size,
        file_path: file.path,
        status: 'processing'
      });

      // 2. Extract Document Text, Multi-Page Inspection & Vision Findings
      let documentData = { text: '', inspection: {}, vision_findings: [] };
      try {
        documentData = await ocrService.extractDocument(file.path, file.mimetype);
      } catch (ocrErr) {
        logger.error(`Document extraction error for ${reportRecord.id}: ${ocrErr.message}`);
        await db.updateReportStatus(reportRecord.id, 'error', ocrErr.message);
        return res.status(422).json({
          error: true,
          code: 'EXTRACTION_FAILED',
          message: `Unable to extract readable text from the uploaded document: ${ocrErr.message}`
        });
      }

      const extractedText = documentData.text || '';

      if (!extractedText || extractedText.trim().length === 0) {
        await db.updateReportStatus(reportRecord.id, 'error', 'Empty or unreadable document.');
        return res.status(422).json({
          error: true,
          code: 'EMPTY_DOCUMENT',
          message: 'The uploaded medical report contained no readable text or values. Please ensure the scan is clear and legible.'
        });
      }

      // 3. Process with Agentic Coordinator (Multi-Page Extraction + Analyzer + RAG + Risk Assessor)
      const agentResult = await agentService.processReport(extractedText, {
        ...reportRecord,
        inspection: documentData.inspection,
        vision_findings: documentData.vision_findings
      });

      // 4. Save Structured Report Result
      const resultRecord = await db.saveReportResult({
        report_id: reportRecord.id,
        report_type: agentResult.report_type,
        extracted_data: agentResult.abnormal_findings.concat(agentResult.normal_findings),
        important_findings: agentResult.important_findings,
        normal_findings: agentResult.normal_findings,
        abnormal_findings: agentResult.abnormal_findings,
        possible_significance: agentResult.possible_significance,
        general_guidance: agentResult.general_guidance,
        questions_for_doctor: agentResult.questions_for_doctor,
        urgency: agentResult.urgency,
        urgency_category: agentResult.urgency_category,
        limitations: agentResult.limitations,
        sources: agentResult.sources,
        raw_ocr_text: extractedText,
        document_category: agentResult.document_category || 'LABORATORY',
        structured_report: agentResult.structured_report || null,
        uncertain_fields: agentResult.uncertain_fields || [],
        debug_trace: agentResult.debug_trace || null
      });

      // 5. Initialize Conversation for follow-up chat
      const conversation = await db.getOrCreateConversation(reportRecord.id);

      // Save initial assistant introduction message
      await db.saveMessage(
        conversation.id,
        'assistant',
        'assistant',
        agentResult.summary,
        agentResult
      );

      // 6. Update Report Status to Analyzed
      await db.updateReportStatus(reportRecord.id, 'analyzed');

      res.status(201).json({
        success: true,
        message: 'Medical report successfully uploaded, extracted, and analyzed.',
        report: reportRecord,
        conversation_id: conversation.id,
        result: agentResult
      });
    } catch (err) {
      next(err);
    }
  }

  async getReports(req, res, next) {
    try {
      const reports = await db.getAllReports();
      res.json({ success: true, reports });
    } catch (err) {
      next(err);
    }
  }

  async getReportById(req, res, next) {
    try {
      const { id } = req.params;
      const report = await db.getReport(id);

      if (!report) {
        return res.status(404).json({ error: true, message: 'Report not found.' });
      }

      const result = await db.getReportResult(id);
      const conversation = await db.getOrCreateConversation(id);

      res.json({
        success: true,
        report,
        conversation_id: conversation ? conversation.id : null,
        result
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteReport(req, res, next) {
    try {
      const { id } = req.params;
      const report = await db.getReport(id);

      if (!report) {
        return res.status(404).json({ error: true, message: 'Report not found.' });
      }

      // Delete physical file for patient privacy
      if (fs.existsSync(report.file_path)) {
        try {
          fs.unlinkSync(report.file_path);
        } catch (e) {
          logger.warn(`Could not remove file on disk: ${report.file_path}`);
        }
      }

      await db.deleteReport(id);
      logger.info(`Report ${id} and associated file securely removed.`);

      res.json({
        success: true,
        message: 'Medical report and associated files successfully deleted.'
      });
    } catch (err) {
      next(err);
    }
  }

  async getSpokenSummary(req, res, next) {
    try {
      const { id } = req.params;
      const { language = 'en', simple_mode = 'true' } = req.query;
      const result = await db.getReportResult(id);

      if (!result) {
        return res.status(404).json({ error: true, message: 'Report analysis not found.' });
      }

      const spokenText = agentService.generateSpokenSummary(
        result,
        language,
        simple_mode === 'true' || simple_mode === true
      );

      res.json({
        success: true,
        report_id: id,
        language,
        simple_mode: simple_mode === 'true' || simple_mode === true,
        spoken_summary: spokenText,
        urgency: result.urgency,
        urgency_category: result.urgency_category
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
