/**
 * Unit Tests: Report Extraction Service
 */

const assert = require('assert');
const extractionService = require('../src/services/extractionService');

describe('ExtractionService', () => {
  it('should correctly detect report types', () => {
    assert.strictEqual(
      extractionService.detectReportType('Patient CBC Hemoglobin 14.0 Platelet 250'),
      'Complete Blood Count (CBC)'
    );
    assert.strictEqual(
      extractionService.detectReportType('Lipid Panel Total Cholesterol 240 LDL 160'),
      'Lipid Profile'
    );
    assert.strictEqual(
      extractionService.detectReportType('ALT 45 AST 38 Bilirubin 0.8'),
      'Liver Function Test (LFT)'
    );
    assert.strictEqual(
      extractionService.detectReportType('Creatinine 1.2 BUN 15 eGFR 85'),
      'Kidney Function Test (KFT / Renal Panel)'
    );
  });

  it('should extract parameters, numerical values, and reference ranges from column text', () => {
    const raw = `
TEST NAME                  RESULT    UNIT       REFERENCE RANGE   FLAG
Hemoglobin                 9.4       g/dL       12.0 - 15.5       LOW
Platelet Count             240       10^3/uL    150 - 450         NORMAL
Total Cholesterol          265       mg/dL      < 200             HIGH
    `;
    const extracted = extractionService.extractParameters(raw);

    assert.strictEqual(extracted.length, 3);
    
    const hb = extracted.find(p => p.parameter === 'Hemoglobin');
    assert.ok(hb);
    assert.strictEqual(hb.result_value, 9.4);
    assert.strictEqual(hb.unit, 'g/dL');
    assert.strictEqual(hb.reference_range, '12.0 - 15.5');
    assert.strictEqual(hb.flag, 'LOW');

    const chol = extracted.find(p => p.parameter === 'Total Cholesterol');
    assert.ok(chol);
    assert.strictEqual(chol.result_value, 265);
    assert.strictEqual(chol.flag, 'HIGH');
  });

  it('should gracefully handle empty or malformed strings', () => {
    const res = extractionService.extractParameters('');
    assert.deepStrictEqual(res, []);
  });
});
