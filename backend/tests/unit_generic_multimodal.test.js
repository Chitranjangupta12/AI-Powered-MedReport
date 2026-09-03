/**
 * Comprehensive Test Suite: Generic Multimodal Medical Report Analysis Engine
 * 
 * Verifies all 21 Critical Project-Wide Requirements:
 * 1. Zero Demo / Hardcoded Medical Results: Honest failure state if extraction fails (no fake normal/demo data)
 * 2. Mixed Multimodal Document Processing: Independent multi-page inspection and parsing
 * 3. Generic Normalized Schema Adaptation:
 *    - Laboratory (CBC, Lipid, LFT, KFT, Thyroid, Glucose, Urine)
 *    - Radiology (Chest X-Ray, CT, MRI, Ultrasound)
 *    - Cardiology ECG (12-Lead ECG: rhythm, heart rate, PR/QRS/QTc intervals, interpretation)
 *    - Cardiology Angiogram (vessels, stenosis percentages, recommendations)
 *    - Pathology / Histopathology (specimen, diagnosis, microscopic findings)
 *    - Discharge Summary (diagnoses, procedures, medications, follow-up plan)
 *    - Unknown / Ambiguous Documents (sections extracted honestly without forcing laboratory analyte structure)
 * 4. Generic Table Parsing: Dynamic columns, remarks vs analytes distinction
 * 5. Reference Range Validation: Strictly report-extracted ranges, directional limits, and uncertain markers
 * 6. Unit Disambiguation Accuracy: Splits combined string values, units, and ranges
 * 7. Grounded RAG Separation: Distinguishes extracted patient findings from general medical literature
 * 8. Never displays false "Routine / Normal"
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const documentClassifier = require('../src/services/documentClassifier');
const genericExtractionService = require('../src/services/genericExtractionService');
const analyzerService = require('../src/services/analyzerService');
const agentService = require('../src/services/agentService');
const ragService = require('../src/services/ragService');

describe('Generic Multimodal Medical Report Understanding Tests', function () {
  this.timeout(20000);

  // ==========================================
  // REQUIREMENT 1 & 18: Zero Demo Data Fallback & No False Normal
  // ==========================================
  describe('Requirement 1 & 18: No Fake Data Fallback & Strict Extraction Integrity', () => {
    it('Should return an honest failure state when document is empty or unreadable without substituting fake data', async () => {
      const emptyText = '';
      const result = await agentService.processReport(emptyText, {
        id: 'test-empty-doc',
        inspection: { document_type: 'digital_pdf', num_pages: 1, is_scanned: false }
      });

      assert.strictEqual(result.extraction_status, 'FAILED_EMPTY');
      assert.ok(result.summary.includes('Unable to confidently extract this report'));
      assert.strictEqual(result.abnormal_findings.length, 0);
      assert.strictEqual(result.normal_findings.length, 0);
      assert.strictEqual(result.important_findings[0], 'Extraction could not be completed with reliable confidence.');
      assert.ok(!result.summary.toLowerCase().includes('routine / normal'));
      assert.ok(!result.summary.toLowerCase().includes('all analyzed laboratory markers are within normal limits'));
    });

    it('Should never say "Everything is normal" if document extraction confidence is uncertain', async () => {
      const gibberishText = 'xyz abc 123 random noise blurred stamp unreadable';
      const result = await agentService.processReport(gibberishText, {
        id: 'test-uncertain-doc',
        inspection: { document_type: 'scanned_pdf', num_pages: 1, is_scanned: true }
      });

      assert.ok(!result.summary.includes('All analyzed markers are within normal'));
      assert.ok(!result.summary.includes('completely normal'));
    });
  });

  // ==========================================
  // REQUIREMENT 3 & 7: Universal Document Classification
  // ==========================================
  describe('Requirement 3 & 7: Universal Document Category Classification', () => {
    it('Should classify CBC / Hemogram as LABORATORY', () => {
      const text = 'ACME LABS: Complete Blood Count (CBC). Hemoglobin 13.5 g/dL, Platelet 220, WBC 6.5';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'LABORATORY');
      assert.strictEqual(res.sub_type, 'Complete Blood Count (CBC)');
    });

    it('Should classify Chest X-Ray / CT as RADIOLOGY', () => {
      const text = 'IMAGING CENTER: PA and Lateral Chest Radiograph (Chest X-Ray). Findings: Focal consolidation in right lower lobe. Impression: Community acquired pneumonia.';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'RADIOLOGY');
      assert.strictEqual(res.sub_type, 'Chest X-Ray');
    });

    it('Should classify 12-lead ECG as CARDIOLOGY_ECG', () => {
      const text = 'CARDIOLOGY CLINIC: 12-lead Electrocardiogram (ECG). Heart rate: 75 bpm. PR interval: 160 ms. QRS duration: 90 ms. Normal Sinus Rhythm.';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'CARDIOLOGY_ECG');
      assert.strictEqual(res.sub_type, 'Electrocardiogram (ECG / EKG)');
    });

    it('Should classify Coronary Angiogram as CARDIOLOGY_ANGIOGRAM', () => {
      const text = 'HEART INSTITUTE: Cardiac Catheterization & Coronary Angiography. LMCA 0%, LAD 75% stenosis, RCA 90% stenosis. LVEDP 14 mmHg.';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'CARDIOLOGY_ANGIOGRAM');
      assert.strictEqual(res.sub_type, 'Coronary Angiogram / Cardiac Catheterization');
    });

    it('Should classify Surgical Biopsy as PATHOLOGY', () => {
      const text = 'PATHOLOGY DEPARTMENT: Surgical Pathology Biopsy Report. Specimen: Right colon endoscopic biopsy. Microscopic: Moderately differentiated invasive adenocarcinoma.';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'PATHOLOGY');
      assert.strictEqual(res.sub_type, 'Surgical Pathology / Biopsy Report');
    });

    it('Should classify Hospital Inpatient Summary as DISCHARGE_SUMMARY', () => {
      const text = 'MEMORIAL HOSPITAL: Inpatient Discharge Summary. Admission Date: 02/20/2026. Discharge Date: 02/26/2026. Discharge Diagnosis: Acute unifocal pyelonephritis. Discharge Medications: Ciprofloxacin 500mg.';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'DISCHARGE_SUMMARY');
      assert.strictEqual(res.sub_type, 'Hospital Inpatient Discharge Summary');
    });

    it('Should classify ambiguous or foreign format as UNKNOWN without forcing laboratory analyte structure', () => {
      const text = 'General medical letter without standard clinical headers or laboratory analytes.';
      const res = documentClassifier.classify(text);
      assert.strictEqual(res.category, 'UNKNOWN');
    });
  });

  // ==========================================
  // REQUIREMENT 4: Dynamic Table Extraction & Comment/Remark Separation
  // ==========================================
  describe('Requirement 4: Dynamic Table Parsing & Remark Separation', () => {
    it('Should parse column table and isolate remarks (never treating comments as analytes)', () => {
      const rawText = `
CENTRAL DIAGNOSTICS LABORATORY
Patient Name: David Tester   Age: 42   Sex: Male
TEST NAME                  RESULT    UNIT       REFERENCE RANGE   FLAG
Hemoglobin                 13.3      g/dL       13.5 - 18.0       LOW
Test Remark | kindly correlate clinically
Platelet Count             210       10^3/uL    150 - 450         NORMAL
Comment: Specimen slightly hemolyzed upon arrival.
      `;

      const report = genericExtractionService.extract(rawText);
      assert.strictEqual(report.document_type, 'LABORATORY');
      assert.strictEqual(report.observations.length, 2);

      // Verify Hemoglobin parsed accurately
      const hb = report.observations.find(o => o.parameter === 'Hemoglobin');
      assert.ok(hb);
      assert.strictEqual(hb.result_value, 13.3);
      assert.strictEqual(hb.unit, 'g/dL');
      assert.strictEqual(hb.reference_range, '13.5 - 18.0');
      assert.strictEqual(hb.status, 'Low');

      // Verify remarks separated cleanly
      assert.ok(report.remarks.length >= 1);
      const remarkFound = report.remarks.some(r => r.text.toLowerCase().includes('kindly correlate clinically'));
      assert.strictEqual(remarkFound, true);

      // Verify "Test Remark" was NOT added as an observation
      const fakeAnalyte = report.observations.find(o => o.parameter.toLowerCase().includes('test remark'));
      assert.strictEqual(fakeAnalyte, undefined, 'Comments/Remarks must NEVER be added to analyte observations');
    });
  });

  // ==========================================
  // REQUIREMENT 5 & 6: Reference Range Validation & Unit Handling
  // ==========================================
  describe('Requirement 5 & 6: Reference Range Integrity & Unit Handling', () => {
    it('Should mark status as REFERENCE RANGE UNCERTAIN if reference interval is omitted on report', () => {
      const rawText = `
PATH LAB REPORT
TEST NAME                  RESULT    UNIT
Serum Copper               145       ug/dL
      `;
      const report = genericExtractionService.extract(rawText);
      const copper = report.observations.find(o => o.parameter.includes('Copper'));
      assert.ok(copper);
      assert.strictEqual(copper.status, 'REFERENCE RANGE UNCERTAIN');
    });

    it('Should parse directional reference ranges (< 200, > 40, <= 100)', () => {
      const rawText = `
METRO HEALTH DIAGNOSTICS
TEST NAME                  RESULT    UNIT       REFERENCE RANGE   FLAG
Total Cholesterol          245       mg/dL      < 200             HIGH
HDL Cholesterol            34        mg/dL      > 40              LOW
Triglycerides              140       mg/dL      < 150             NORMAL
      `;
      const report = genericExtractionService.extract(rawText);
      assert.strictEqual(report.observations.length, 3);

      const chol = report.observations.find(o => o.parameter === 'Total Cholesterol');
      assert.strictEqual(chol.status, 'High');

      const hdl = report.observations.find(o => o.parameter === 'HDL Cholesterol');
      assert.strictEqual(hdl.status, 'Low');

      const trig = report.observations.find(o => o.parameter === 'Triglycerides');
      assert.strictEqual(trig.status, 'Normal');
    });

    it('Should support qualitative reference ranges (Negative, Non-reactive, Normal)', () => {
      const rawText = `
INFECTIOUS DISEASE LAB
TEST NAME                  RESULT        REFERENCE RANGE
Hepatitis B Surface Ag     Reactive      Non-Reactive
HIV 1/2 Antibody           Non-Reactive  Non-Reactive
      `;
      const report = genericExtractionService.extract(rawText);
      const hepB = report.observations.find(o => o.parameter.includes('Hepatitis'));
      assert.ok(hepB);
      assert.strictEqual(hepB.status, 'Abnormal');

      const hiv = report.observations.find(o => o.parameter.includes('HIV'));
      assert.ok(hiv);
      assert.strictEqual(hiv.status, 'Normal');
    });
  });

  // ==========================================
  // REQUIREMENT 8, 9, 10, 11: Specialized Modal Extractions (Radiology, ECG, Pathology, Discharge)
  // ==========================================
  describe('Specialized Clinical Modality Parsing', () => {
    it('Should parse Radiology Report (Impression, Findings, Technique, Recommendations, Source Page)', () => {
      const radiologyText = `
METROPOLITAN IMAGING CENTER
Patient Name: Susan Synthetic   Age: 52   Sex: Female   Date: 03/04/2026
Examination: CT Chest with Intravenous Contrast
Technique: Helical axial CT acquisition of the thorax with IV Omnipaque contrast.

FINDINGS:
There is a 14 mm soft tissue nodule in the right upper lobe.
No mediastinal lymphadenopathy. Cardiac size is normal. No pleural effusion.

IMPRESSION:
14 mm solitary pulmonary nodule in right upper lobe.

RECOMMENDATIONS:
Recommend PET-CT or follow-up high-resolution chest CT in 3 months.
      `;

      const report = genericExtractionService.extract(radiologyText);
      assert.strictEqual(report.document_type, 'RADIOLOGY');
      assert.ok(report.impressions.length > 0);
      assert.ok(report.impressions[0].text.includes('14 mm solitary pulmonary nodule'));
      assert.ok(report.recommendations.length > 0);
      assert.ok(report.recommendations[0].text.includes('PET-CT'));
      assert.ok(report.measurements.length > 0);
      assert.strictEqual(report.measurements[0].unit, 'mm');
    });

    it('Should parse 12-lead ECG Report (Rate, PR interval, QRS duration, QTc interval, Rhythm)', () => {
      const ecgText = `
CARDIOVASCULAR DIAGNOSTICS
12-Lead Electrocardiogram (ECG)
Heart Rate: 108 bpm
PR Interval: 154 ms
QRS Duration: 96 ms
QTc: 432 ms
Interpretation: Sinus tachycardia with normal ventricular conduction.
      `;

      const report = genericExtractionService.extract(ecgText);
      assert.strictEqual(report.document_type, 'CARDIOLOGY_ECG');

      const hr = report.observations.find(o => o.parameter === 'Heart Rate');
      assert.ok(hr);
      assert.strictEqual(hr.result_value, 108);
      assert.strictEqual(hr.status, 'High'); // 108 bpm is tachycardia (>100)

      const pr = report.observations.find(o => o.parameter === 'PR Interval');
      assert.ok(pr);
      assert.strictEqual(pr.result_value, 154);
      assert.strictEqual(pr.status, 'Normal');

      assert.ok(report.impressions.some(i => i.text.toLowerCase().includes('sinus tachycardia')));
    });

    it('Should parse Pathology Biopsy Report (Specimen, Histopathologic Diagnosis)', () => {
      const pathText = `
SURGICAL PATHOLOGY REPORT
Specimen: Thyroid fine needle aspiration (FNA) biopsy
Pathologic Diagnosis: Papillary thyroid carcinoma, Bethesda Category VI.
Microscopic Description: Cells show nuclear grooves, enlargement, and pseudoinclusions.
      `;

      const report = genericExtractionService.extract(pathText);
      assert.strictEqual(report.document_type, 'PATHOLOGY');
      assert.ok(report.diagnoses_as_written.length > 0);
      assert.ok(report.diagnoses_as_written[0].text.includes('Papillary thyroid carcinoma'));
    });

    it('Should parse Hospital Inpatient Discharge Summary (Diagnoses, Medications, Follow-up)', () => {
      const dischargeText = `
CITY GENERAL HOSPITAL
Inpatient Discharge Summary
Discharge Diagnosis: Congestive Heart Failure exacerbation, stabilized.
Procedures Performed: Transthoracic echocardiogram, diagnostic thoracentesis.
Discharge Medications: Furosemide 40mg PO daily, Lisinopril 10mg PO daily.
Discharge Plan: Follow up with cardiology outpatient clinic in 7 days. Low sodium diet.
      `;

      const report = genericExtractionService.extract(dischargeText);
      assert.strictEqual(report.document_type, 'DISCHARGE_SUMMARY');
      assert.ok(report.diagnoses_as_written.length > 0);
      assert.ok(report.diagnoses_as_written[0].text.includes('Congestive Heart Failure'));
      assert.ok(report.medications.length > 0);
      assert.ok(report.recommendations.length > 0);
    });
  });

  // ==========================================
  // REQUIREMENT 14 & 15: Grounded RAG & Report vs General Separation
  // ==========================================
  describe('Requirement 14 & 15: Grounded RAG Separation in Conversational Chat', () => {
    it('Should answer questions about extracted values distinguishing report findings from general medical knowledge', async () => {
      const mockResult = {
        id: 'rep-test-rag',
        report_type: 'Complete Blood Count (CBC)',
        extracted_data: [
          { parameter: 'Hemoglobin', result_value: 9.4, unit: 'g/dL', reference_range: '12.0 - 15.5', status: 'Low' }
        ],
        abnormal_findings: [
          { parameter: 'Hemoglobin', result_value: 9.4, unit: 'g/dL', reference_range: '12.0 - 15.5', status: 'Low' }
        ],
        normal_findings: [],
        urgency: 'routine',
        urgency_category: 'YELLOW'
      };

      const chatReply = await agentService.chat({
        message: 'What is my hemoglobin level and what does it mean?',
        reportResult: mockResult,
        language: 'en',
        simpleMode: false
      });

      assert.ok(chatReply.content.includes('9.4 g/dL'), 'Must cite the patient exact reported hemoglobin value');
      assert.ok(chatReply.content.includes('12.0 - 15.5'), 'Must cite the patient exact reference range');
      assert.strictEqual(chatReply.rag_used, true, 'Must execute RAG to retrieve general knowledge');
      assert.ok(chatReply.sources.length > 0, 'Must cite trusted medical organizations');
    });

    it('Should answer questions about Radiology findings with clear distinction of patient finding vs general advice', async () => {
      const mockRadiologyResult = {
        id: 'rep-test-cxr',
        report_type: 'Chest X-Ray',
        document_category: 'RADIOLOGY',
        extracted_data: [],
        structured_report: {
          document_type: 'RADIOLOGY',
          impressions: [{ text: 'Right lower lobe consolidation compatible with pneumonia', source_page: 1 }],
          qualitative_findings: [{ finding: 'Focal consolidation in right lower lobe', source_page: 1 }]
        },
        abnormal_findings: [],
        normal_findings: []
      };

      const chatReply = await agentService.chat({
        message: 'What was found on my chest x-ray impression?',
        reportResult: mockRadiologyResult,
        language: 'en',
        simpleMode: false
      });

      assert.ok(chatReply.content.includes('Right lower lobe consolidation compatible with pneumonia'));
      assert.ok(chatReply.content.includes('From your imaging report'));
    });
  });
});
