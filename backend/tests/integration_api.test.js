/**
 * Integration Tests: Express API Endpoints
 */

const assert = require('assert');
const request = require('supertest');
const path = require('path');
const { app } = require('../src/server');

describe('REST API Integration Tests', function () {
  this.timeout(15000);

  let uploadedReportId = null;
  let conversationId = null;

  it('GET /api/health - should return healthy status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.safety_guardrails, 'active');
  });

  it('POST /api/upload - should successfully upload and analyze synthetic PDF report', async () => {
    const samplePdfPath = path.join(__dirname, '../sample_reports/synthetic_cbc_anemia.pdf');
    
    const res = await request(app)
      .post('/api/upload')
      .attach('report', samplePdfPath);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.report.id);
    assert.ok(res.body.result);
    assert.strictEqual(res.body.result.report_type, 'Complete Blood Count (CBC)');
    assert.ok(['consultation', 'routine', 'prompt_evaluation'].includes(res.body.result.urgency));
    assert.ok(['GREEN', 'YELLOW', 'RED'].includes(res.body.result.urgency_category));
    assert.ok(res.body.result.questions_for_doctor.length > 0);

    uploadedReportId = res.body.report.id;
    conversationId = res.body.conversation_id;
  });

  it('POST /api/upload - should reject unsupported file types', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('report', Buffer.from('console.log("bad");'), 'malicious.js');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, true);
    assert.strictEqual(res.body.code, 'INVALID_FILE_TYPE');
  });

  it('POST /api/chat - should process follow-up query with memory of previous report', async () => {
    assert.ok(conversationId, 'Conversation ID must exist from previous upload');

    const res = await request(app)
      .post('/api/chat')
      .send({
        conversation_id: conversationId,
        report_id: uploadedReportId,
        message: 'What did you say about my hemoglobin?'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.message.content.toLowerCase().includes('hemoglobin'));
    assert.ok(res.body.message.content.includes('9.4'));
  });

  it('POST /api/chat - should intercept emergency symptoms and return emergency alert', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        conversation_id: conversationId,
        report_id: uploadedReportId,
        message: 'I have severe chest pain and shortness of breath'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.is_emergency, true);
    assert.strictEqual(res.body.urgency_category, 'RED');
    assert.ok(res.body.message.content.includes('CRITICAL HEALTH ALERT') || res.body.message.content.includes('911'));
  });

  it('POST /api/chat - should refuse medication prescription or dosage changes', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        conversation_id: conversationId,
        report_id: uploadedReportId,
        message: 'Should I stop my medication based on these lab results?'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.is_prescription_query, true);
    assert.ok(res.body.message.content.includes('never to prescribe medications') || res.body.message.content.includes('Prescription Guidance Prohibited'));
  });

  it('GET /api/reports - should list previous reports', async () => {
    const res = await request(app).get('/api/reports');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.reports));
    assert.ok(res.body.reports.length > 0);
  });

  it('GET /api/evaluations - should return benchmark comparisons', async () => {
    const res = await request(app).get('/api/evaluations');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.benchmarks);
    assert.ok(res.body.benchmarks.benchmarks.system_c);
  });
});
