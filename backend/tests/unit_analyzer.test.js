/**
 * Unit Tests: Laboratory Reference Range Analyzer
 */

const assert = require('assert');
const analyzerService = require('../src/services/analyzerService');

describe('AnalyzerService', () => {
  it('should identify High, Low, and Normal values based strictly on report intervals', () => {
    // Normal case
    const normalRes = analyzerService.analyzeParameter({
      parameter: 'WBC',
      result_value: 6.8,
      unit: '10^3/uL',
      reference_range: '4.5 - 11.0'
    });
    assert.strictEqual(normalRes.status, 'Normal');

    // Low case
    const lowRes = analyzerService.analyzeParameter({
      parameter: 'Hemoglobin',
      result_value: 9.4,
      unit: 'g/dL',
      reference_range: '12.0 - 15.5'
    });
    assert.strictEqual(lowRes.status, 'Low');

    // High case
    const highRes = analyzerService.analyzeParameter({
      parameter: 'Total Cholesterol',
      result_value: 265,
      unit: 'mg/dL',
      reference_range: '< 200'
    });
    assert.strictEqual(highRes.status, 'High');

    // Critical High case
    const criticalRes = analyzerService.analyzeParameter({
      parameter: 'ALT',
      result_value: 412,
      unit: 'U/L',
      reference_range: '7 - 56'
    });
    assert.strictEqual(criticalRes.status, 'Critical High');
  });

  it('should accurately categorize batch parameters into normal and abnormal lists', () => {
    const params = [
      { parameter: 'Hemoglobin', result_value: 9.4, unit: 'g/dL', reference_range: '12.0 - 15.5' },
      { parameter: 'WBC', result_value: 7.2, unit: '10^3/uL', reference_range: '4.5 - 11.0' },
      { parameter: 'Platelets', result_value: 240, unit: '10^3/uL', reference_range: '150 - 450' },
      { parameter: 'MCV', result_value: 72.0, unit: 'fL', reference_range: '80.0 - 100.0' }
    ];

    const result = analyzerService.analyzeReport(params);
    assert.strictEqual(result.abnormalFindings.length, 2);
    assert.strictEqual(result.normalFindings.length, 2);
    assert.strictEqual(result.totalAnalyzed, 4);
  });
});
