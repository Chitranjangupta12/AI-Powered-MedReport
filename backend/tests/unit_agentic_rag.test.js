/**
 * Unit & Integration Tests: Real Agentic RAG System
 * 
 * Verifies:
 * 1. Dense vector embedding generation & cosine similarity calculations
 * 2. Vector search retrieval over knowledge base with similarity thresholding & metadata
 * 3. Agentic query intent classification (Intent A, B, C, D, E) & selective tool invocation
 * 4. Grounded clinical responses with traceable sources without hallucinated numbers
 * 5. Memory recall & conversational context anchoring
 * 6. Non-English (Hindi, Hinglish) RAG queries routing through vector retrieval
 */

const assert = require('assert');
const embeddingService = require('../src/services/embeddingService');
const ragService = require('../src/services/ragService');
const agentService = require('../src/services/agentService');

describe('Real Agentic RAG System Tests', function () {
  this.timeout(10000);

  const mockReport = {
    report_type: 'Kidney Function Test (KFT)',
    urgency: 'consultation',
    urgency_category: 'YELLOW',
    extracted_data: [
      { parameter: 'Serum Creatinine', result_value: 1.8, unit: 'mg/dL', reference_range: '0.7 - 1.3', status: 'High' },
      { parameter: 'eGFR', result_value: 45, unit: 'mL/min', reference_range: '>= 60', status: 'Low' },
      { parameter: 'Serum Sodium', result_value: 140, unit: 'mEq/L', reference_range: '136 - 145', status: 'Normal' }
    ],
    normal_findings: [
      { parameter: 'Serum Sodium', result_value: 140, unit: 'mEq/L', reference_range: '136 - 145' }
    ],
    abnormal_findings: [
      { parameter: 'Serum Creatinine', result_value: 1.8, unit: 'mg/dL', reference_range: '0.7 - 1.3', status: 'High' },
      { parameter: 'eGFR', result_value: 45, unit: 'mL/min', reference_range: '>= 60', status: 'Low' }
    ],
    questions_for_doctor: [
      'What does my elevated creatinine or reduced eGFR indicate about my kidney clearance?'
    ]
  };

  it('should generate 384-dimensional dense normalized embeddings and calculate cosine similarity', async () => {
    const vec1 = await embeddingService.getEmbedding('Creatinine kidney function and renal clearance');
    const vec2 = await embeddingService.getEmbedding('Serum creatinine laboratory blood test');
    const vec3 = await embeddingService.getEmbedding('Platelets and blood coagulation');

    assert.strictEqual(vec1.length, 384);
    assert.strictEqual(vec2.length, 384);

    const sim12 = embeddingService.cosineSimilarity(vec1, vec2);
    const sim13 = embeddingService.cosineSimilarity(vec1, vec3);

    // Related medical topics should have substantially higher similarity than unrelated topics
    assert.ok(sim12 > sim13, `Expected related similarity (${sim12}) > unrelated similarity (${sim13})`);
    assert.ok(sim12 > 0.15, `Expected cosine similarity to be positive and significant (${sim12})`);
  });

  it('should perform vector similarity search over authoritative knowledge base and return traceable metadata', async () => {
    const results = await ragService.searchVectors('What is hemoglobin?', 3);
    assert.ok(results.length > 0, 'Expected at least 1 retrieved chunk');

    const topHit = results[0];
    assert.ok(topHit.parameter.toLowerCase().includes('hemoglobin') || topHit.title.toLowerCase().includes('hemoglobin'));
    assert.ok(topHit.organization.includes('NIH') || topHit.organization.includes('CDC') || topHit.organization.includes('National Institutes'));
    assert.ok(topHit.url.startsWith('http'));
    assert.ok(topHit.relevance_score > 0.6);
    assert.ok(['High', 'Moderate', 'Relevant'].includes(topHit.relevance_tier));
  });

  it('should selectively route queries based on agent intent classification', () => {
    // Intent A: Report value query
    const intentA = agentService.classifyQueryIntent('What is my creatinine?', mockReport);
    assert.strictEqual(intentA.intent, 'REPORT_VALUE_QUERY');
    assert.ok(intentA.tools.includes('REPORT_ANALYZER'));

    // Intent B: General clinical concept definition
    const intentB = agentService.classifyQueryIntent('What does hemoglobin mean?', mockReport);
    assert.strictEqual(intentB.intent, 'GENERAL_MEDICAL_EXPLANATION');
    assert.ok(intentB.tools.includes('MEDICAL_RAG_SEARCH'));
    assert.strictEqual(intentB.requiresReport, false);

    // Intent C: Report finding explanation
    const intentC = agentService.classifyQueryIntent('My hemoglobin is low. What causes this?', mockReport);
    assert.strictEqual(intentC.intent, 'REPORT_EXPLANATION');
    assert.ok(intentC.tools.includes('REPORT_ANALYZER'));
    assert.ok(intentC.tools.includes('MEDICAL_RAG_SEARCH'));

    // Intent D: Concerning / danger inquiry
    const intentD = agentService.classifyQueryIntent('Is this dangerous?', mockReport);
    assert.strictEqual(intentD.intent, 'CONCERN_RISK_ASSESSMENT');
    assert.ok(intentD.tools.includes('RISK_ASSESSMENT'));

    // Intent E: Memory question
    const intentE = agentService.classifyQueryIntent('What did you say earlier?', mockReport);
    assert.strictEqual(intentE.intent, 'CONVERSATION_MEMORY');
    assert.ok(intentE.tools.includes('CONVERSATION_MEMORY'));
  });

  it('should combine patient report values with RAG retrieved clinical evidence without hallucination', async () => {
    const res = await agentService.processChatMessage(
      'Why is my creatinine high?',
      mockReport,
      [],
      { language: 'en', simple_mode: false }
    );

    assert.strictEqual(res.rag_used, true);
    assert.ok(res.documents_retrieved > 0);
    assert.ok(res.tools_used.includes('REPORT_ANALYZER'));
    assert.ok(res.tools_used.includes('MEDICAL_RAG_SEARCH'));

    // Must cite the patient's actual number (1.8 mg/dL) from mockReport
    assert.ok(res.content.includes('1.8'), 'Response must include patient exact report value 1.8');
    assert.ok(res.content.includes('Creatinine'));
    assert.ok(res.sources.length > 0);
    assert.ok(res.sources[0].url.startsWith('https://'));
  });

  it('should recall prior dialogue turns when invoking Conversation Memory tool', async () => {
    const mockHistory = [
      { role: 'user', content: 'What is my eGFR?' },
      { role: 'assistant', content: 'Your eGFR is 45 mL/min, which is below the normal laboratory reference of 60.' }
    ];

    const res = await agentService.processChatMessage(
      'What did you say about my results earlier?',
      mockReport,
      mockHistory,
      { language: 'en' }
    );

    assert.ok(res.tools_used.includes('CONVERSATION_MEMORY'));
    assert.ok(res.content.includes('Earlier in our consultation') || res.content.includes('discussed'));
  });

  it('should retrieve authoritative evidence for multilingual queries (Hindi / Hinglish)', async () => {
    const resHi = await agentService.processChatMessage(
      'Creatinine kya hota hai?',
      mockReport,
      [],
      { language: 'hinglish', simple_mode: true }
    );

    assert.strictEqual(resHi.language, 'hinglish');
    assert.ok(resHi.tools_used.includes('REPORT_ANALYZER') || resHi.tools_used.includes('MEDICAL_RAG_SEARCH'));
    assert.ok(resHi.content.includes('Creatinine'));
    assert.ok(resHi.sources.length > 0, 'Should attach authoritative sources even in Hinglish');
  });
});
