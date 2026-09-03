/**
 * Unit & Integration Tests: Multimodal Document Ingestion & Coronary Angiography Pipeline
 * 
 * Verifies:
 * 1. Scanned PDF Detection (identifies low-text, scanned, and fluoroscopic image documents)
 * 2. Multi-page document inspection (processes both Page 1 and Page 2, preserving source_page provenance)
 * 3. Optical Character Recognition (OCR) + Visual Layout Analysis of diagrams, tables, and handwritten values
 * 4. Extraction of coronary artery branches (LMCA, LAD, LCx, RCA, PDA) and stenosis percentages
 * 5. Explicit identification of uncertain handwriting ("unclear / requires verification") without fabrication
 * 6. Grounded Agentic RAG retrieval of ACC/AHA cardiology guidelines
 * 7. Multilingual and Simple Mode explanations (English, Hindi, Hinglish) and Voice Readout
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const multimodalDocService = require('../src/services/multimodalDocumentService');
const ocrService = require('../src/services/ocrService');
const visionService = require('../src/services/visionService');
const extractionService = require('../src/services/extractionService');
const agentService = require('../src/services/agentService');
const ragService = require('../src/services/ragService');

describe('Multimodal Medical Document & Coronary Angiogram Ingestion Tests', function () {
  this.timeout(15000);

  const sampleAngioPdfPath = path.join(__dirname, '../sample_reports/synthetic_coronary_angiogram.pdf');

  before(function () {
    if (!fs.existsSync(sampleAngioPdfPath)) {
      this.skip();
    }
  });

  it('Requirement 1 & 2: Should detect scanned/handwritten multi-page PDF and inspect both pages', async () => {
    const inspection = await multimodalDocService.inspectDocument(sampleAngioPdfPath);
    
    assert.strictEqual(inspection.is_scanned, true, 'Coronary angiogram PDF must be flagged as scanned/image-based');
    assert.strictEqual(inspection.document_type, 'scanned_pdf');
    assert.strictEqual(inspection.num_pages, 2, 'Must inspect both pages of the 2-page document');
    assert.strictEqual(inspection.pages.length, 2);
    assert.strictEqual(inspection.pages[0].page_number, 1);
    assert.strictEqual(inspection.pages[1].page_number, 2);
  });

  it('Requirement 3 & 4: Should perform multi-page OCR and vision layout analysis', async () => {
    const extractedDoc = await ocrService.extractDocument(sampleAngioPdfPath);

    assert.ok(extractedDoc.text.length > 500, 'Combined extracted text should be substantial');
    assert.strictEqual(extractedDoc.inspection.num_pages, 2);
    assert.strictEqual(extractedDoc.vision_findings.length, 2, 'Vision analysis must process both pages');

    // Page 1 vision findings
    const page1Vision = extractedDoc.vision_findings[0];
    assert.strictEqual(page1Vision.page_number, 1);
    assert.strictEqual(page1Vision.document_structure.has_diagram, true, 'Page 1 must identify coronary artery anatomy diagram');
    assert.ok(page1Vision.stenosis_findings.length >= 3, 'Page 1 must extract stenosis table entries');

    // Page 2 vision findings
    const page2Vision = extractedDoc.vision_findings[1];
    assert.strictEqual(page2Vision.page_number, 2);
    assert.ok(page2Vision.recommendations.length > 0, 'Page 2 must extract recommendations and clinical plan');
  });

  it('Requirement 5: Should produce structured angiogram representation with source pages and uncertainty', async () => {
    const extractedDoc = await ocrService.extractDocument(sampleAngioPdfPath);
    const angioData = extractionService.extractAngiogramData(extractedDoc.text, extractedDoc.vision_findings);

    // Arteries and stenosis findings
    assert.ok(angioData.arteries.includes('LAD'));
    assert.ok(angioData.arteries.includes('RCA'));
    assert.ok(angioData.arteries.includes('LMCA'));

    const ladFinding = angioData.stenosis_findings.find(s => s.artery === 'LAD');
    assert.ok(ladFinding, 'LAD stenosis must be present');
    assert.ok(ladFinding.stenosis_percentage.includes('75%'));
    assert.strictEqual(ladFinding.source_page, 1, 'LAD finding must be tagged to Page 1');

    const rcaFinding = angioData.stenosis_findings.find(s => s.artery === 'RCA');
    assert.ok(rcaFinding, 'RCA stenosis must be present');
    assert.ok(rcaFinding.stenosis_percentage.includes('90%'));
    assert.strictEqual(rcaFinding.source_page, 1, 'RCA finding must be tagged to Page 1');

    // Requirement 11: Uncertain handwriting marking
    assert.ok(angioData.uncertain_fields.length > 0, 'Faint or unclear handwriting must be captured');
    const uncertainItem = angioData.uncertain_fields[0];
    assert.strictEqual(uncertainItem.value, 'unclear / requires verification');
    assert.strictEqual(uncertainItem.source_page, 2, 'Unclear handwriting remark is on Page 2');
  });

  it('Requirement 6 & 7: Should synthesize report context with Agentic RAG without inventing values', async () => {
    const extractedDoc = await ocrService.extractDocument(sampleAngioPdfPath);
    const reportResult = await agentService.processReport(extractedDoc.text, {
      id: 'angio-test-uuid',
      file_type: 'application/pdf',
      inspection: extractedDoc.inspection,
      vision_findings: extractedDoc.vision_findings
    });

    assert.ok(reportResult.summary.includes('Coronary Angiogram'));
    assert.ok(reportResult.summary.includes('LAD (75%)') || reportResult.summary.includes('LAD'));
    assert.ok(reportResult.summary.includes('RCA (90%)') || reportResult.summary.includes('RCA'));
    assert.strictEqual(reportResult.urgency_category, 'RED', 'Severe 90% RCA stenosis must escalate to RED / prompt evaluation');

    // Safe Debug Trace (Requirement 12)
    assert.ok(reportResult.debug_trace);
    assert.strictEqual(reportResult.debug_trace.number_of_pages, 2);
    assert.strictEqual(reportResult.debug_trace.is_scanned, true);
    assert.ok(reportResult.debug_trace.tools_used.includes('VISION_ANALYZER'));

    // Verify RAG citations from ACC/AHA
    assert.ok(reportResult.sources.length > 0);
    assert.ok(reportResult.sources[0].organization.includes('Heart') || reportResult.sources[0].organization.includes('ACC'));
  });

  it('Requirement 8, 9 & 10: Should support interactive Q&A and Voice Readout in English, Hindi, and Hinglish', async () => {
    const extractedDoc = await ocrService.extractDocument(sampleAngioPdfPath);
    const reportResult = await agentService.processReport(extractedDoc.text, {
      id: 'angio-test-uuid',
      file_type: 'application/pdf',
      inspection: extractedDoc.inspection,
      vision_findings: extractedDoc.vision_findings
    });

    // 1. Specific Artery Query: "What does RCA 90% stenosis mean?"
    const chatRes = await agentService.processChatMessage(
      'What does RCA 90% stenosis mean in my report?',
      reportResult,
      [],
      { language: 'en', simple_mode: true }
    );

    assert.ok(chatRes.content.includes('RCA') || chatRes.content.includes('Right Coronary'));
    assert.ok(chatRes.content.includes('90%') || chatRes.content.includes('narrowing'));
    assert.ok(chatRes.sources.length > 0);
    assert.strictEqual(chatRes.rag_used, true);

    // 2. Hindi Spoken Summary
    const spokenHi = agentService.generateSpokenSummary(reportResult, 'hi', true);
    assert.ok(spokenHi.includes('एंजियोग्राम') || spokenHi.includes('नसों'));
    assert.ok(spokenHi.includes('Cardiologist') || spokenHi.includes('हृदय'));

    // 3. Hinglish Spoken Summary
    const spokenHinglish = agentService.generateSpokenSummary(reportResult, 'hinglish', true);
    assert.ok(spokenHinglish.includes('Angiogram') || spokenHinglish.includes('arteries'));
    assert.ok(spokenHinglish.includes('Cardiologist'));
  });
});
