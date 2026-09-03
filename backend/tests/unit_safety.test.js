/**
 * Unit Tests: Clinical Safety, Emergency Triage, and Privacy Redaction
 */

const assert = require('assert');
const {
  checkEmergencySymptoms,
  checkPrescriptionRequest,
  redactPii
} = require('../src/middleware/safetyMiddleware');

describe('SafetyMiddleware & Clinical Guardrails', () => {
  it('should detect emergency red-flag symptoms', () => {
    assert.strictEqual(checkEmergencySymptoms('I am having severe chest pain and shortness of breath'), true);
    assert.strictEqual(checkEmergencySymptoms('My left arm has sudden weakness and I feel slurred speech'), true);
    assert.strictEqual(checkEmergencySymptoms('Can you explain my hemoglobin result?'), false);
  });

  it('should detect and block prescription / dosage alteration requests', () => {
    assert.strictEqual(checkPrescriptionRequest('Should I stop my medication now?'), true);
    assert.strictEqual(checkPrescriptionRequest('Can you prescribe me something for high cholesterol?'), true);
    assert.strictEqual(checkPrescriptionRequest('Should I increase my dose of blood pressure pills?'), true);
    assert.strictEqual(checkPrescriptionRequest('What does my LDL cholesterol result mean?'), false);
  });

  it('should redact sensitive PII like SSNs, phone numbers, and emails', () => {
    const raw = 'Patient SSN is 123-45-6789, email is test.patient@example.com and phone is 555-123-4567.';
    const redacted = redactPii(raw);

    assert.ok(!redacted.includes('123-45-6789'));
    assert.ok(!redacted.includes('test.patient@example.com'));
    assert.ok(!redacted.includes('555-123-4567'));
    assert.ok(redacted.includes('[REDACTED_PII]'));
  });
});
