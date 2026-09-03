/**
 * Unit & Integration Tests: Voice & Multilingual Assistant Features
 */

const assert = require('assert');
const request = require('supertest');
const { app } = require('../src/server');
const agentService = require('../src/services/agentService');
const { checkEmergencySymptoms, checkPrescriptionRequest } = require('../src/middleware/safetyMiddleware');

describe('Voice & Multilingual Assistant Tests', function () {
  this.timeout(10000);

  const mockReportResult = {
    report_type: 'Kidney Function Test (KFT)',
    urgency: 'consultation',
    urgency_category: 'YELLOW',
    extracted_data: [
      { parameter: 'Serum Creatinine', result_value: 1.65, unit: 'mg/dL', reference_range: '0.70 - 1.30', status: 'High' },
      { parameter: 'eGFR', result_value: 48, unit: 'mL/min', reference_range: '>= 60', status: 'Low' },
      { parameter: 'Serum Sodium', result_value: 139, unit: 'mEq/L', reference_range: '136 - 145', status: 'Normal' }
    ],
    normal_findings: [
      { parameter: 'Serum Sodium', result_value: 139, unit: 'mEq/L', reference_range: '136 - 145' }
    ],
    abnormal_findings: [
      { parameter: 'Serum Creatinine', result_value: 1.65, unit: 'mg/dL', reference_range: '0.70 - 1.30', status: 'High' },
      { parameter: 'eGFR', result_value: 48, unit: 'mL/min', reference_range: '>= 60', status: 'Low' }
    ],
    questions_for_doctor: [
      'What does my elevated creatinine or reduced eGFR indicate about my kidney clearance?'
    ]
  };

  it('should generate concise spoken report summaries in English, Hindi, and Hinglish', () => {
    const summaryEn = agentService.generateSpokenSummary(mockReportResult, 'en', true);
    assert.ok(summaryEn.includes('Kidney Function Test'));
    assert.ok(summaryEn.includes('outside the normal laboratory range'));
    assert.ok(summaryEn.includes('healthcare professional'));

    const summaryHi = agentService.generateSpokenSummary(mockReportResult, 'hi', true);
    assert.ok(summaryHi.includes('Kidney Function Test'));
    assert.ok(summaryHi.includes('ध्यान देने की आवश्यकता है') || summaryHi.includes('सामान्य सीमा से अलग'));
    assert.ok(summaryHi.includes('डॉक्टर'));

    const summaryHinglish = agentService.generateSpokenSummary(mockReportResult, 'hinglish', true);
    assert.ok(summaryHinglish.includes('Kidney Function Test'));
    assert.ok(summaryHinglish.includes('dhyan dene ki zaroorat hai'));
    assert.ok(summaryHinglish.includes('doctor'));
  });

  it('should answer specific parameter queries in Hindi keeping medical terms in English', async () => {
    const res = await agentService.processChatMessage(
      'Mera creatinine kaisa hai?',
      mockReportResult,
      [],
      { language: 'hi', simple_mode: true }
    );

    assert.strictEqual(res.language, 'hi');
    assert.strictEqual(res.simple_mode, true);
    assert.ok(res.content.includes('Creatinine'));
    assert.ok(res.content.includes('1.65'));
    assert.ok(res.content.includes('सामान्य सीमा') || res.content.includes('अधिक'));
  });

  it('should answer in Hinglish with simple mode explanation', async () => {
    const res = await agentService.processChatMessage(
      'Kya meri kidney report normal hai?',
      mockReportResult,
      [],
      { language: 'hinglish', simple_mode: true }
    );

    assert.strictEqual(res.language, 'hinglish');
    assert.strictEqual(res.simple_mode, true);
    assert.ok(res.content.includes('Creatinine') || res.content.includes('abnormal') || res.content.includes('doctor'));
  });

  it('should detect emergency symptoms in Hindi / Hinglish and return urgent escalation', async () => {
    const isEmergency = checkEmergencySymptoms('Mujhe seene mein dard aur saans lene me takleef hai');
    assert.strictEqual(isEmergency, true);

    const res = await agentService.processChatMessage(
      'Mujhe seene mein dard ho raha hai',
      mockReportResult,
      [],
      { language: 'hi' }
    );
    assert.strictEqual(res.is_emergency, true);
    assert.strictEqual(res.urgency_category, 'RED');
    assert.ok(res.content.includes('आपातकालीन') || res.content.includes('अस्पताल') || res.content.includes('112'));
  });

  it('should intercept prescription queries in Hindi / Hinglish and refuse to prescribe', async () => {
    const isRx = checkPrescriptionRequest('Kya mujhe creatinine ki dawa shuru karni chahiye?');
    assert.strictEqual(isRx, true);

    const res = await agentService.processChatMessage(
      'Mujhe dawa prescribe kar do',
      mockReportResult,
      [],
      { language: 'hinglish' }
    );
    assert.strictEqual(res.is_prescription_query, true);
    assert.ok(res.content.includes('Prescription') || res.content.includes('doctor se zaroor salah'));
  });
});
