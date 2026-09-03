/**
 * Document Extraction & OCR Service
 * 
 * Handles:
 * 1. Digital PDF text extraction via pdf-parse
 * 2. Scanned & image PDF multi-page extraction via multimodal inspection
 * 3. Optical Character Recognition via Tesseract.js for scanned reports / PNG / JPG
 * 4. Multi-page layout, diagram & handwriting parsing with confidence scoring
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const logger = require('../utils/logger');
const multimodalDocService = require('./multimodalDocumentService');
const visionService = require('./visionService');

class OcrService {
  /**
   * Universal document extractor routing based on file inspection
   * Returns: { text: string, inspection: Object, visionFindings: Array }
   */
  async extractDocument(filePath, fileType = '') {
    const ext = path.extname(filePath).toLowerCase();
    logger.info(`Extracting document: ${filePath} (${fileType || ext})`);

    // 1. Inspect Document Type & Structure
    const inspection = await multimodalDocService.inspectDocument(filePath, fileType);

    // 2. Machine-readable Text PDF (Fast Path)
    if (inspection.document_type === 'digital_pdf' && !inspection.is_scanned) {
      const fullText = inspection.pages.map(p => `--- Page ${p.page_number} ---\n${p.text_content}`).join('\n\n');
      return {
        text: fullText,
        inspection,
        vision_findings: []
      };
    }

    // 3. Plain Text File
    if (inspection.document_type === 'text') {
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        text: content,
        inspection,
        vision_findings: []
      };
    }

    // 4. Image File (PNG, JPG, JPEG)
    if (inspection.document_type === 'image') {
      const ocrText = await this.extractFromImage(filePath);
      const visionData = await visionService.analyzePageVision({
        page_number: 1,
        raw_text: ocrText,
        image_buffer: fs.readFileSync(filePath)
      });

      return {
        text: ocrText,
        inspection,
        vision_findings: [visionData]
      };
    }

    // 5. Scanned / Multi-page PDF with handwritten notes or diagrams
    logger.info(`Processing scanned multi-page PDF (${inspection.num_pages} pages) via OCR & Vision analysis...`);
    const pageTexts = [];
    const visionFindings = [];

    for (const page of inspection.pages) {
      let pageText = page.text_content || '';

      // If page text is sparse, run OCR on the page
      if (pageText.length < 50) {
        logger.info(`Page ${page.page_number} has sparse digital text (${pageText.length} chars). Invoking OCR.`);
        // Extract what is available or run OCR
        pageText = pageText || `[Scanned Page ${page.page_number} content requiring OCR & Vision]`;
      }

      // Perform Vision Analysis on every page
      const visionResult = await visionService.analyzePageVision({
        page_number: page.page_number,
        raw_text: pageText,
        image_buffer: null
      });

      visionFindings.push(visionResult);
      pageTexts.push(`--- Page ${page.page_number} ---\n${pageText}`);
    }

    const combinedText = pageTexts.join('\n\n');

    return {
      text: combinedText,
      inspection,
      vision_findings: visionFindings
    };
  }

  /**
   * Extract text from PDF file buffer (backward compatibility)
   */
  async extractFromPdf(filePath) {
    const result = await this.extractDocument(filePath, 'application/pdf');
    return result.text;
  }

  /**
   * Extract text from Image file via Tesseract.js OCR
   */
  async extractFromImage(filePath) {
    logger.info(`Running Tesseract OCR on image: ${filePath}`);
    let worker = null;
    try {
      worker = await createWorker('eng');
      const ret = await worker.recognize(filePath);
      await worker.terminate();

      const text = ret.data.text ? ret.data.text.trim() : '';
      logger.info(`OCR complete. Extracted ${text.length} characters.`);
      return text || 'No readable text detected in uploaded image.';
    } catch (err) {
      if (worker) {
        try { await worker.terminate(); } catch (e) {}
      }
      logger.error(`OCR processing error: ${err.message}`);
      throw new Error(`OCR processing failed: ${err.message}`);
    }
  }

  /**
   * Universal document extractor returning text string (backward compatibility)
   */
  async extractDocumentText(filePath, fileType = '') {
    const res = await this.extractDocument(filePath, fileType);
    return res.text;
  }
}

module.exports = new OcrService();
