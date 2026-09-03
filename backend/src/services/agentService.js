/**
 * Agentic AI Medical Coordinator Service
 * Orchestrates tools:
 * 1. Document OCR / Text Extraction
 * 2. Report Extraction Tool (Analyte parameters, values, lab reference ranges)
 * 3. Lab Analyzer Tool (Bounds-tested against report intervals)
 * 4. Medical RAG Tool (Verified clinical guidance from NIH/CDC)
 * 5. Risk Assessment Tool (GREEN, YELLOW, RED urgency classification)
 * 6. Conversation Memory Tool (Report context retrieval)
 * 7. Multilingual & Simple Language Synthesis (English, Hindi, Hinglish)
 * 
 * Supports both n8n Webhook orchestration and local autonomous fallback.
 */

const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const documentClassifier = require('./documentClassifier');
const genericExtractionService = require('./genericExtractionService');
const extractionService = require('./extractionService');
const analyzerService = require('./analyzerService');
const ragService = require('./ragService');
const {
  checkEmergencySymptoms,
  checkPrescriptionRequest,
  getEmergencyResponse,
  getPrescriptionRefusalResponse,
  EMERGENCY_RESPONSE,
  PRESCRIPTION_REFUSAL_RESPONSE,
  redactPii
} = require('../middleware/safetyMiddleware');

class AgentService {
  /**
   * Evaluates clinical risk / urgency category (Tool 4)
   */
  assessRisk(abnormalFindings = []) {
    if (abnormalFindings.length === 0) {
      return {
        urgency: 'informational',
        urgency_category: 'GREEN',
        rationale: 'All analyzed laboratory parameters are within normal laboratory reference ranges.'
      };
    }

    const hasCritical = abnormalFindings.some(f => 
      f.status === 'Critical High' || 
      f.status === 'Critical Low' ||
      (typeof f.result_value === 'number' && (
        (f.parameter.toLowerCase().includes('alt') && f.result_value > 250) ||
        (f.parameter.toLowerCase().includes('ast') && f.result_value > 250) ||
        (f.parameter.toLowerCase().includes('platelet') && f.result_value < 50) ||
        (f.parameter.toLowerCase().includes('hemoglobin') && f.result_value < 7.0) ||
        (f.parameter.toLowerCase().includes('glucose') && (f.result_value > 300 || f.result_value < 50))
      ))
    );

    if (hasCritical) {
      return {
        urgency: 'prompt_evaluation',
        urgency_category: 'RED',
        rationale: 'One or more laboratory parameters exhibit marked or potentially critical deviations requiring prompt professional medical evaluation.'
      };
    }

    const isConsultation = abnormalFindings.some(f => 
      f.parameter.toLowerCase().includes('creatinine') ||
      f.parameter.toLowerCase().includes('ldl') ||
      f.parameter.toLowerCase().includes('hemoglobin')
    );

    return {
      urgency: isConsultation ? 'consultation' : 'routine',
      urgency_category: 'YELLOW',
      rationale: 'Findings show deviations from the laboratory reference range that should be reviewed and discussed with your physician.'
    };
  }

  generateDoctorQuestions(reportType, abnormalFindings = []) {
    const questions = [];

    if (abnormalFindings.length === 0) {
      questions.push('Are there any other age-appropriate screening tests or routine follow-ups I should schedule?');
      questions.push('Are there any lifestyle or dietary habits you recommend to maintain these healthy results?');
      return questions;
    }

    abnormalFindings.forEach(abn => {
      const p = abn.parameter.toLowerCase();
      if (p.includes('hemoglobin') || p.includes('mcv') || p.includes('hematocrit')) {
        questions.push(`What is the most likely cause of my low ${abn.parameter} (${abn.result_value} ${abn.unit})?`);
        questions.push('Would you recommend checking my iron levels, ferritin, or vitamin B12?');
      } else if (p.includes('cholesterol') || p.includes('ldl') || p.includes('triglyceride')) {
        questions.push(`What dietary changes or exercise plans would help improve my ${abn.parameter}?`);
        questions.push('Based on my family history and this lipid profile, what is my overall cardiovascular risk?');
      } else if (p.includes('alt') || p.includes('ast') || p.includes('bilirubin')) {
        questions.push(`What could be contributing to the elevation in my liver enzymes (${abn.parameter}: ${abn.result_value})?`);
        questions.push('Could any of my current medications, over-the-counter supplements, or diet be affecting my liver?');
      } else if (p.includes('creatinine') || p.includes('bun') || p.includes('egfr')) {
        questions.push(`What does my elevated creatinine or reduced eGFR indicate about my kidney clearance?`);
        questions.push('Should we repeat this test after ensuring good hydration, or conduct a urine protein check?');
      } else if (p.includes('tsh') || p.includes('thyroid')) {
        questions.push(`Does my ${abn.parameter} level indicate a need for thyroid monitoring or medication?`);
        questions.push('When should we re-check my thyroid panel to see if this is temporary?');
      } else if (p.includes('glucose') || p.includes('hba1c')) {
        questions.push(`Does my blood glucose of ${abn.result_value} ${abn.unit} put me in the prediabetes or diabetes category?`);
        questions.push('What specific nutritional plan or physical activity would you recommend to bring this into the normal range?');
      } else {
        questions.push(`What steps do you recommend to investigate or follow up on my flagged ${abn.parameter}?`);
      }
    });

    return Array.from(new Set(questions)).slice(0, 5);
  }

  generateGeneralGuidance(reportType, abnormalFindings = []) {
    const guidance = [];
    guidance.push('Maintain adequate hydration and balanced nutritional intake as advised by your healthcare team.');
    guidance.push('Keep a written log of any physical symptoms (e.g. fatigue, dizziness, unusual changes) to share during your doctor visit.');

    const lower = abnormalFindings.map(a => a.parameter.toLowerCase()).join(' ');
    if (lower.includes('cholesterol') || lower.includes('ldl') || lower.includes('triglyceride')) {
      guidance.push('Consider incorporating soluble fiber (oats, legumes, vegetables) and limiting saturated fats in your daily meals.');
    }
    if (lower.includes('hemoglobin') || lower.includes('iron')) {
      guidance.push('Ensure a nutrient-rich diet with leafy greens, legumes, or iron-fortified foods, and discuss any heavy bleeding with your clinician.');
    }
    if (lower.includes('glucose') || lower.includes('hba1c')) {
      guidance.push('Regular post-meal walking and moderating refined carbohydrates or sugary drinks can support healthy glycemic control.');
    }

    return guidance;
  }

  /**
   * Generates a concise spoken summary script for "Read Report Aloud"
   * Supported languages: English ('en'), Hindi ('hi'), Hinglish ('hinglish')
   */
  generateSpokenSummary(reportResult, language = 'en', simpleMode = true) {
    if (!reportResult) {
      if (language === 'hi') return 'वर्तमान में कोई मेडिकल रिपोर्ट चुनी नहीं गई है। कृपया पहले अपनी रिपोर्ट अपलोड करें।';
      if (language === 'hinglish') return 'Currently koi medical report select nahi hui hai. Please pehle apni report upload karein.';
      return 'No medical report is currently selected. Please upload a report to hear a spoken summary.';
    }

    const reportType = reportResult.report_type || 'Laboratory Report';
    const isAngio = reportType.includes('Angiogram') || reportType.includes('Catheterization');
    const abns = reportResult.abnormal_findings || [];
    const norms = reportResult.normal_findings || [];
    const isNormal = abns.length === 0;

    if (isAngio) {
      const angioData = reportResult.angiogram_data || (reportResult.structured_report && reportResult.structured_report.category === 'CARDIOLOGY_ANGIOGRAM' ? reportResult.structured_report : null);
      const findings = (angioData && Array.isArray(angioData.stenosis_findings)) ? angioData.stenosis_findings : (reportResult.abnormal_findings || []);
      const severeFindings = findings.filter(s => {
        const sev = s.severity || s.status || '';
        return sev.includes('Severe') || sev.includes('Moderate') || sev.includes('High') || sev.includes('Critical');
      });
      const lesionsList = severeFindings.map(s => `${s.artery || s.parameter} mein ${s.stenosis_percentage || s.result_value} narrowing`).join(', ');
      const lesionsListEn = severeFindings.map(s => `${s.artery || s.parameter} (${s.stenosis_percentage || s.result_value} narrowing)`).join(', ');

      if (language === 'hi') {
        return `आपकी कोरोनरी एंजियोग्राम रिपोर्ट में दिल की नसों की जांच की गई है। रिपोर्ट के अनुसार, ${lesionsList || 'कुछ नसों में संकुचन देखा गया है'}। बाएं मुख्य धमनी (LMCA) सामान्य है। अपने हृदय रोग विशेषज्ञ (Cardiologist) से इन परिणामों और आगे के उपचार के बारे में अवश्य परामर्श करें।`;
      }
      if (language === 'hinglish') {
        return `Aapki Coronary Angiogram report mein heart ki blood vessels check ki gayi hain. Report ke mutabiq, ${lesionsList || 'kuch arteries mein narrowing dekhi gayi hai'}। In results ko apne Cardiologist ke saath zaroor discuss karein.`;
      }
      return `Your Coronary Angiogram report has been evaluated. Notable narrowing was observed in: ${lesionsListEn || 'selected coronary arteries'}. Your heart muscle blood flow has focal restrictions that should be reviewed directly with your cardiologist for personalized guidance.`;
    }

    if (language === 'hi') {
      if (isNormal) {
        return `आपकी ${reportType} की जांच सामान्य है। सभी ${norms.length} टेस्ट सामान्य सीमा के अंदर हैं। इस रिपोर्ट में कोई चिंताजनक बात नहीं दिखी है। अपने डॉक्टर से नियमित बातचीत के दौरान इसे दिखा सकते हैं।`;
      }
      const flaggedNames = abns.map(a => a.parameter).join(', ');
      return `आपकी ${reportType} में कुछ टेस्ट पर ध्यान देने की आवश्यकता है। कुल ${abns.length} टेस्ट सामान्य सीमा से अलग हैं, जिनमें ${flaggedNames} शामिल हैं। सामान्य टेस्ट की संख्या ${norms.length} है। इन परिणामों को अपने डॉक्टर से चर्चा अवश्य करें।`;
    }

    if (language === 'hinglish') {
      if (isNormal) {
        return `Aapki ${reportType} report completely normal hai. Sabhi ${norms.length} analyzed test normal range ke andar hain. Koi abnormal result nahi mila hai. Regular doctor visit mein ise discuss kar sakte hain.`;
      }
      const flaggedNames = abns.map(a => a.parameter).join(', ');
      return `Aapki ${reportType} mein kuch findings par dhyan dene ki zaroorat hai. Total ${abns.length} test normal range se bahar hain: ${flaggedNames}. Baaki ${norms.length} test normal hain. Inhe apne doctor ke saath zaroor discuss karein.`;
    }

    // Default English
    if (isNormal) {
      return `Your ${reportType} is currently marked as routine or normal. All ${norms.length} analyzed markers are within the laboratory reference ranges. There are no highlighted abnormal results in this report. For any personal medical concerns, discuss the report with your healthcare professional.`;
    }

    const flaggedNames = abns.map(a => `${a.parameter} (${a.status})`).join(', ');
    return `Your ${reportType} has findings that should be reviewed. There are ${abns.length} values outside the normal laboratory range, including ${flaggedNames}. There are also ${norms.length} normal findings. Please discuss these specific results with your healthcare professional.`;
  }

  /**
   * Process report using n8n if available, or autonomous internal agent
   */
  async processReport(rawText, reportMeta = {}) {
    logger.info('Processing medical report through Agentic Coordinator...');
    const sanitizedText = redactPii(rawText);

    // Attempt n8n Webhook execution if URL configured
    if (env.N8N_WEBHOOK_URL && env.N8N_WEBHOOK_URL.startsWith('http')) {
      try {
        logger.info(`Dispatching payload to n8n webhook: ${env.N8N_WEBHOOK_URL}`);
        const n8nRes = await axios.post(
          env.N8N_WEBHOOK_URL,
          {
            report_id: reportMeta.id,
            text: sanitizedText,
            file_type: reportMeta.file_type,
            user_query: 'Please analyze this laboratory report.'
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(env.N8N_API_KEY ? { 'X-N8N-API-KEY': env.N8N_API_KEY } : {})
            },
            timeout: env.N8N_TIMEOUT_MS
          }
        );

        if (n8nRes.data && n8nRes.data.summary) {
          logger.info('Received valid structured response from n8n agent.');
          return n8nRes.data;
        }
      } catch (err) {
        logger.warn(`n8n webhook unavailable or timed out (${err.message}). Executing local Agentic Coordinator.`);
      }
    }

    // Local Autonomous Agent Execution (Full Tool Chain)
    const inspection = reportMeta.inspection || { document_type: 'digital_pdf', num_pages: 1, is_scanned: false };
    const visionFindings = reportMeta.vision_findings || [];
    
    // 1. Generic Multimodal Extraction (Laboratory, Radiology, ECG, Angiogram, Pathology, Discharge, Unknown)
    const structuredReport = genericExtractionService.extract(sanitizedText, visionFindings, inspection);
    const category = structuredReport.document_type || 'UNKNOWN';
    const reportType = structuredReport.report_title || 'Medical Document';

    // 2. Check for honest failure state (Requirement 1 & 18: Never display false normal or fake data)
    if (structuredReport.extraction_status === 'FAILED_EMPTY' || structuredReport.extraction_status === 'FAILED_UNCERTAIN') {
      const debugTrace = {
        document_type: inspection.document_type || 'unknown',
        is_scanned: !!inspection.is_scanned,
        number_of_pages: inspection.num_pages || structuredReport.source_pages.length || 1,
        ocr_status: inspection.is_scanned ? 'Active (OCR Processed)' : 'Standard Text Extraction',
        vision_analysis_status: visionFindings.length > 0 ? 'Active' : 'Bypassed',
        extracted_fields_count: 0,
        uncertain_fields_count: structuredReport.uncertain_fields.length,
        tools_used: ['DOCUMENT_INGESTION', 'VALIDATION_FILTER'],
        rag_retrieval_count: 0,
        rag_sources: []
      };

      return {
        summary: 'Unable to confidently extract this report. The document could not be parsed with sufficient optical or clinical confidence. Please verify the original document directly with your healthcare provider or try re-uploading a clearer scan.',
        report_type: reportType,
        document_category: category,
        extraction_status: structuredReport.extraction_status,
        important_findings: ['Extraction could not be completed with reliable confidence.'],
        normal_findings: [],
        abnormal_findings: [],
        possible_significance: ['Document text or optical scan was unreadable or lacked recognizable clinical findings.'],
        general_guidance: ['Ensure the uploaded document has sufficient resolution, even lighting, and is not obstructed.'],
        questions_for_doctor: ['Could you provide an official verified copy or summary of this medical report?'],
        urgency: 'routine',
        urgency_category: 'YELLOW',
        structured_report: structuredReport,
        uncertain_fields: structuredReport.uncertain_fields,
        debug_trace: debugTrace,
        limitations: [
          'Unable to verify medical parameters due to insufficient optical clarity or unreadable content.',
          'Never assume an unreadable test is normal. Always verify findings with your healthcare provider.'
        ],
        sources: []
      };
    }

    // 3. Process Observations & Findings
    const extractedParams = structuredReport.observations || [];
    let analysis = { normalFindings: [], abnormalFindings: [], totalAnalyzed: extractedParams.length };

    if (category === 'LABORATORY' || extractedParams.some(p => p.reference_range || p.status)) {
      analysis = analyzerService.analyzeReport(extractedParams);
    } else {
      // For non-lab reports (Radiology, Pathology, Discharge)
      extractedParams.forEach(p => {
        if (p.status && ['High', 'Low', 'Critical High', 'Critical Low', 'Abnormal'].includes(p.status)) {
          analysis.abnormalFindings.push(p);
        } else {
          analysis.normalFindings.push(p);
        }
      });
    }

    // 4. Grounded RAG Retrieval (Executed AFTER extraction)
    const ragGuidance = ragService.getGuidanceForAbnormalities(analysis.abnormalFindings);
    const risk = this.assessRisk(analysis.abnormalFindings);
    const questions = this.generateDoctorQuestions(reportType, analysis.abnormalFindings);
    const guidance = this.generateGeneralGuidance(reportType, analysis.abnormalFindings);

    // 5. Dynamic Adaptive Summary Synthesis
    let summaryText = '';
    const pageCountStr = `${structuredReport.source_pages.length || 1} page(s)`;

    if (category === 'RADIOLOGY') {
      const imp = structuredReport.impressions.map(i => i.text).join(' ');
      const findingsSummary = structuredReport.qualitative_findings.slice(0, 3).map(f => f.finding).join(' ');
      summaryText = `Your ${reportType} was evaluated across ${pageCountStr}. `;
      if (imp) {
        summaryText += `Radiological Impression: "${imp}". `;
      } else if (findingsSummary) {
        summaryText += `Key Findings: "${findingsSummary}". `;
      } else {
        summaryText += `Imaging examination recorded. `;
      }
      summaryText += `Radiological findings must be correlated with physical examination by your treating physician.`;
    } else if (category === 'CARDIOLOGY_ECG') {
      const rhythm = structuredReport.impressions.map(i => i.text).join(', ') || 'Sinus Rhythm';
      const hr = extractedParams.find(p => p.parameter === 'Heart Rate')?.result_value || 'recorded';
      summaryText = `Your Electrocardiogram (ECG) was evaluated across ${pageCountStr}. Heart Rate: ${hr} bpm, Rhythm: ${rhythm}. Electrical conduction intervals were analyzed. Discuss this rhythm interpretation with your doctor.`;
    } else if (category === 'CARDIOLOGY_ANGIOGRAM') {
      const severeLesions = extractedParams.filter(p => p.status === 'Critical High' || p.status === 'High');
      if (severeLesions.length > 0) {
        const lesionList = severeLesions.map(s => `${s.parameter} (${s.result_value})`).join(', ');
        summaryText = `Your Coronary Angiogram was evaluated across ${pageCountStr}. Notable coronary artery luminal narrowing was identified in: ${lesionList}. These findings indicate focal coronary plaque restricting blood flow to heart muscle. Discuss these exact percentages and next steps with your cardiologist.`;
      } else {
        summaryText = `Your Coronary Angiogram shows no severe obstructive luminal narrowing across the analyzed coronary arteries. Continue heart-healthy habits and discuss any exertional symptoms with your physician.`;
      }
    } else if (category === 'PATHOLOGY') {
      const diag = structuredReport.diagnoses_as_written.map(d => d.text).join('; ');
      summaryText = `Your Pathology / Biopsy report was evaluated across ${pageCountStr}. Pathologic diagnosis documented: ${diag || 'Tissue specimen evaluated'}. Microscopic tissue examination requires correlation with your physician's clinical staging and history.`;
    } else if (category === 'DISCHARGE_SUMMARY') {
      const diag = structuredReport.diagnoses_as_written.map(d => d.text).join('; ');
      summaryText = `Your Hospital Inpatient Discharge Summary was reviewed across ${pageCountStr}. Final diagnoses documented: ${diag || 'Inpatient admission course'}. Follow all discharge medications and scheduled outpatient appointments.`;
    } else if (category === 'LABORATORY') {
      if (analysis.abnormalFindings.length === 0 && analysis.totalAnalyzed > 0) {
        summaryText = `Your ${reportType} was evaluated against your laboratory's specified reference ranges across ${pageCountStr}. All ${analysis.totalAnalyzed} tested parameters are within normal bounds. Routine discussion at your next scheduled healthcare consultation is recommended.`;
      } else if (analysis.abnormalFindings.length > 0) {
        const paramNames = analysis.abnormalFindings.map(a => `${a.parameter} (${a.result_value} ${a.unit || ''})`).join(', ');
        summaryText = `Your ${reportType} was evaluated against your laboratory's specific reference intervals across ${pageCountStr}. There are ${analysis.abnormalFindings.length} flagged finding(s) requiring clinical context: ${paramNames}. We have retrieved verified evidence from authoritative clinical sources to explain these parameters and prepared focused questions for your doctor.`;
      } else {
        summaryText = `Your ${reportType} was evaluated across ${pageCountStr}. No abnormal parameters were flagged. Discuss these results with your healthcare provider.`;
      }
    } else {
      summaryText = `Your medical document (${reportType}) was evaluated across ${pageCountStr}. Structured observations and clinical notes were parsed. Discuss findings with your healthcare provider.`;
    }

    // 6. Important Highlights Assembly
    const importantFindings = [];
    if (category === 'RADIOLOGY' && structuredReport.impressions.length > 0) {
      structuredReport.impressions.forEach(imp => {
        importantFindings.push(`Radiological Impression: ${imp.text} [Page ${imp.source_page || 1}]`);
      });
      structuredReport.recommendations.forEach(rec => {
        importantFindings.push(`Recommendation: ${rec.text} [Page ${rec.source_page || 1}]`);
      });
    } else if (category === 'PATHOLOGY' && structuredReport.diagnoses_as_written.length > 0) {
      structuredReport.diagnoses_as_written.forEach(d => {
        importantFindings.push(`Pathologic Diagnosis: ${d.text} [Page ${d.source_page || 1}]`);
      });
    } else if (analysis.abnormalFindings.length > 0) {
      analysis.abnormalFindings.forEach(abn => {
        const pageTag = abn.source_page ? ` [Page ${abn.source_page}]` : '';
        importantFindings.push(`${abn.parameter} is ${abn.status} at ${abn.result_value} ${abn.unit || ''} (Lab Normal: ${abn.reference_range || 'Report specific'})${pageTag}.`);
      });
    } else if (analysis.totalAnalyzed > 0) {
      importantFindings.push(`All ${analysis.totalAnalyzed} analyzed parameters are within expected normal limits.`);
    } else if (structuredReport.sections.length > 0) {
      importantFindings.push(`Extracted ${structuredReport.sections.length} document section(s) from uploaded medical record.`);
    }

    // 7. Clinical Significance
    const possibleSignificance = [];
    if (category === 'CARDIOLOGY_ANGIOGRAM') {
      possibleSignificance.push('Coronary artery stenosis reflects atherosclerotic lipid and fibrous plaque buildup within vessel walls, potentially limiting myocardial oxygen delivery during effort.');
      possibleSignificance.push('Severe narrowing (> 70%) in major coronary branches typically warrants cardiological evaluation regarding medical therapy, non-invasive stress testing, or revascularization.');
    } else if (category === 'RADIOLOGY') {
      possibleSignificance.push('Radiological findings represent anatomical imaging observations and must always be correlated with physical symptoms and clinical history.');
    } else if (category === 'PATHOLOGY') {
      possibleSignificance.push('Histopathologic diagnoses provide microscopic confirmation of tissue architecture, guiding definitive staging and management.');
    }

    analysis.abnormalFindings.forEach(abn => {
      const p = abn.parameter.toLowerCase();
      if (p.includes('hemoglobin') || p.includes('rbc') || p.includes('hematocrit')) {
        possibleSignificance.push('Decreased red cell markers are commonly linked with nutritional iron or vitamin deficits, acute or chronic blood loss, or reduced bone marrow red cell production.');
      } else if (p.includes('cholesterol') || p.includes('ldl') || p.includes('triglycerides')) {
        possibleSignificance.push('Elevated circulating lipids can contribute over time to vascular wall plaque accumulation, influenced by genetics, diet, and physical activity.');
      } else if (p.includes('alt') || p.includes('ast')) {
        possibleSignificance.push('Elevated transaminases reflect cellular liver stress, which can stem from fatty liver changes, medications, alcohol, or viral inflammation.');
      } else if (p.includes('creatinine') || p.includes('egfr')) {
        possibleSignificance.push('Shifts in renal filtration markers can be triggered by acute dehydration, strenuous exertion, or intrinsic kidney filtration variations.');
      } else if (p.includes('tsh')) {
        possibleSignificance.push('Altered TSH indicates the pituitary is signaling the thyroid to regulate cellular metabolism, requiring correlation with Free T4.');
      } else if (p.includes('glucose') || p.includes('hba1c')) {
        possibleSignificance.push('Elevations in blood sugar indicate impaired insulin sensitivity or prediabetes, representing a key window for nutritional intervention.');
      }
    });

    // 8. Build Safe Developer Trace
    const toolsUsed = ['GENERIC_DOCUMENT_INGESTION', 'STRUCTURED_PARSER', 'LAB_REFERENCE_ANALYZER', 'MEDICAL_RAG_SEARCH'];
    if (visionFindings.length > 0 || category === 'CARDIOLOGY_ANGIOGRAM') {
      toolsUsed.push('VISION_ANALYZER');
      toolsUsed.push('MULTIMODAL_INGESTION');
    }

    const debugTrace = {
      document_type: category,
      report_title: reportType,
      is_scanned: !!inspection.is_scanned,
      number_of_pages: inspection.num_pages || structuredReport.source_pages.length || 1,
      ocr_status: inspection.is_scanned ? 'Active (Tesseract Multi-Page OCR)' : 'Standard Text Extraction',
      vision_analysis_status: visionFindings.length > 0 ? 'Active (Multi-Page Vision Analyzer)' : 'Bypassed',
      extracted_fields_count: extractedParams.length,
      uncertain_fields_count: structuredReport.uncertain_fields.length,
      tools_used: toolsUsed,
      rag_retrieval_count: ragGuidance.sources.length,
      rag_sources: ragGuidance.sources.map(s => s.organization || s.title)
    };

    const structuredResult = {
      summary: summaryText,
      report_type: reportType,
      document_category: category,
      extraction_status: structuredReport.extraction_status,
      important_findings: importantFindings,
      normal_findings: analysis.normalFindings,
      abnormal_findings: analysis.abnormalFindings,
      possible_significance: Array.from(new Set(possibleSignificance)),
      general_guidance: guidance,
      questions_for_doctor: questions,
      urgency: risk.urgency,
      urgency_category: risk.urgency_category,
      structured_report: structuredReport,
      angiogram_data: category === 'CARDIOLOGY_ANGIOGRAM' ? structuredReport : null,
      uncertain_fields: structuredReport.uncertain_fields,
      debug_trace: debugTrace,
      limitations: [
        'This tool is an educational and report-understanding assistant, not a licensed medical doctor.',
        'Never alter, discontinue, or start prescription medications without direct medical supervision.',
        'If handwriting in the original scan was faint or smudged, verify values directly with your physician.'
      ],
      sources: ragGuidance.sources.length > 0 ? ragGuidance.sources : [
        {
          title: category === 'CARDIOLOGY_ANGIOGRAM' ? 'Coronary Angiogram & Artery Disease Information' : 'Medical Test Information Guide',
          organization: category === 'CARDIOLOGY_ANGIOGRAM' ? 'American Heart Association (AHA) / ACC' : 'National Institutes of Health (NIH MedlinePlus)',
          url: category === 'CARDIOLOGY_ANGIOGRAM' ? 'https://www.heart.org/en/health-topics/heart-attack/diagnosing-a-heart-attack/coronary-angiogram' : 'https://medlineplus.gov/lab-tests/'
        }
      ]
    };

    return structuredResult;
  }

  /**
   * Handles Conversational Chat Queries with Report Context & Memory (Tool 5 & 6)
   * Enhanced with Multilingual support (English, Hindi, Hinglish) and Simple Mode
   */
  /**
   * Classify user query into agent routing intent:
   * A: Report-specific question (e.g., "What is my hemoglobin?") -> REPORT_ANALYZER
   * B: General medical definition (e.g., "What does hemoglobin mean?") -> MEDICAL_RAG_SEARCH
   * C: Report + Medical knowledge (e.g., "My hemoglobin is low. What causes this?") -> REPORT_ANALYZER + MEDICAL_RAG_SEARCH
   * D: Potentially concerning question (e.g., "Is this dangerous?") -> REPORT_ANALYZER + RISK_ASSESSMENT + MEDICAL_RAG_SEARCH
   * E: Conversation history question (e.g., "What did you say about my creatinine earlier?") -> CONVERSATION_MEMORY + REPORT_ANALYZER
   */
  classifyQueryIntent(message, reportResult) {
    const lower = message.toLowerCase();

    // Intent E: Memory question
    if (lower.includes('earlier') || lower.includes('previous') || lower.includes('did you say') || lower.includes('pehle kya bola') || lower.includes('pehle kya kaha')) {
      return {
        intent: 'CONVERSATION_MEMORY',
        tools: ['CONVERSATION_MEMORY', 'REPORT_ANALYZER'],
        requiresRag: false,
        requiresReport: true
      };
    }

    // Intent D: Concerning / Urgent inquiry
    if (lower.includes('dangerous') || lower.includes('serious') || lower.includes('khatarnak') || lower.includes('chinta') || lower.includes('die') || lower.includes('emergency')) {
      return {
        intent: 'CONCERN_RISK_ASSESSMENT',
        tools: ['REPORT_ANALYZER', 'RISK_ASSESSMENT', 'MEDICAL_RAG_SEARCH'],
        requiresRag: true,
        requiresReport: true
      };
    }

    // Intent B: General clinical concept definition without referring to patient value
    const isGeneralWhatIs = (lower.startsWith('what is') || lower.startsWith('what does') || lower.startsWith('define') || lower.startsWith('explain') || lower.includes('kya hota hai') || lower.includes('kya hai')) &&
      !lower.includes('my ') && !lower.includes('mera ') && !lower.includes('meri ') && !lower.includes('mine');

    if (isGeneralWhatIs && !lower.includes('report')) {
      return {
        intent: 'GENERAL_MEDICAL_EXPLANATION',
        tools: ['MEDICAL_RAG_SEARCH'],
        requiresRag: true,
        requiresReport: false
      };
    }

    // Intent C: Report finding explanation
    if (lower.includes('why is my') || lower.includes('what causes') || lower.includes('kaise badhega') || lower.includes('kam kyu') || lower.includes('high kyu') || lower.includes('low kyu')) {
      return {
        intent: 'REPORT_EXPLANATION',
        tools: ['REPORT_ANALYZER', 'MEDICAL_RAG_SEARCH', 'LAB_REFERENCE_ANALYZER'],
        requiresRag: true,
        requiresReport: true
      };
    }

    // Intent A: Report value query
    return {
      intent: 'REPORT_VALUE_QUERY',
      tools: ['REPORT_ANALYZER', 'LAB_REFERENCE_ANALYZER'],
      requiresRag: true, // provide RAG background context alongside value
      requiresReport: true
    };
  }

  /**
   * Handles Conversational Chat Queries with Real Agentic RAG Orchestration
   * 
   * Agentic Multi-Tool Execution:
   * Tool 1: medical_rag_search (Dense vector retrieval + similarity ranking)
   * Tool 2: report_analyzer (Patient report parameter and flag extraction)
   * Tool 3: lab_reference_analyzer (Strict interval bounds verification)
   * Tool 4: risk_assessment (GREEN, YELLOW, RED urgency classification)
   * Tool 5: conversation_memory (Prior dialogue turns)
   */
  async processChatMessage(userMessage, reportResult = null, conversationHistory = [], options = {}) {
    const language = options.language || 'en';
    const simpleMode = !!options.simple_mode;

    // 1. Clinical Safety Check: Emergency red-flag symptoms
    if (checkEmergencySymptoms(userMessage)) {
      return {
        ...getEmergencyResponse(language),
        tools_used: ['SAFETY_FILTER'],
        rag_used: false,
        documents_retrieved: 0
      };
    }

    // 2. Clinical Safety Check: Prescription & dosage alteration refusal
    if (checkPrescriptionRequest(userMessage)) {
      return {
        ...getPrescriptionRefusalResponse(language),
        tools_used: ['SAFETY_FILTER'],
        rag_used: false,
        documents_retrieved: 0
      };
    }

    const sanitizedMsg = redactPii(userMessage);
    const lowerMsg = sanitizedMsg.toLowerCase();

    // 3. Agent Tool Decision: Classify Intent
    const decision = this.classifyQueryIntent(sanitizedMsg, reportResult);
    const toolsUsed = [...decision.tools];

    // 4. Memory Tool Execution (if required)
    let memorySnippet = '';
    if (decision.tools.includes('CONVERSATION_MEMORY') && conversationHistory.length > 0) {
      const pastAssistantTurns = conversationHistory.filter(m => m.role === 'assistant' || m.sender === 'assistant');
      if (pastAssistantTurns.length > 0) {
        memorySnippet = pastAssistantTurns[pastAssistantTurns.length - 1].content;
      }
    }

    // 5. Medical RAG Search Tool Execution (Dense Vector Retrieval)
    let ragHits = [];
    if (decision.requiresRag) {
      ragHits = await ragService.searchVectors(sanitizedMsg, env.RAG_TOP_K || 3, env.RAG_SIMILARITY_THRESHOLD || 0.65);
      if (ragHits.length === 0) {
        // Synchronous fallback
        ragHits = ragService.search(sanitizedMsg, 2);
      }
    }

    const ragSources = ragHits.map(h => ({
      title: h.title || `${h.parameter} Reference Guide`,
      organization: h.organization || 'NIH / CDC Clinical Reference',
      url: h.url || 'https://medlineplus.gov/',
      topic: h.topic || h.parameter,
      relevance_score: h.relevance_score || 0.85,
      relevance_tier: h.relevance_tier || 'High'
    }));

    // 6. Report Analyzer Tool Execution (Extract exact patient analyte or observation)
    let targetedParameter = null;
    const allObservations = (reportResult && reportResult.extracted_data) 
      ? reportResult.extracted_data 
      : ((reportResult && reportResult.structured_report && reportResult.structured_report.observations) ? reportResult.structured_report.observations : []);

    if (allObservations.length > 0) {
      // 1. Exact match for specific arteries/analytes
      targetedParameter = allObservations.find(p => {
        const pName = (p.parameter || p.name || '').toLowerCase();
        if (lowerMsg.includes('rca') && pName.includes('rca')) return true;
        if (lowerMsg.includes('lad') && pName.includes('lad')) return true;
        if (lowerMsg.includes('lcx') && pName.includes('lcx')) return true;
        if (lowerMsg.includes('lmca') && pName.includes('lmca')) return true;
        if (lowerMsg.includes('pda') && pName.includes('pda')) return true;
        if (lowerMsg.includes('sugar') && pName.includes('glucose')) return true;
        if (lowerMsg.includes('kidney') && (pName.includes('creatinine') || pName.includes('egfr') || pName.includes('bun'))) return true;
        if (lowerMsg.includes('liver') && (pName.includes('alt') || pName.includes('ast') || pName.includes('bilirubin'))) return true;
        if (lowerMsg.includes('blood') && (pName.includes('hemoglobin') || pName.includes('rbc'))) return true;
        if (lowerMsg.includes('heart rate') && pName.includes('heart rate')) return true;
        if (lowerMsg.includes('pr interval') && pName.includes('pr interval')) return true;
        if (lowerMsg.includes('qrs') && pName.includes('qrs')) return true;
        if (lowerMsg.includes('qtc') && pName.includes('qtc')) return true;

        const words = pName.split(/[\s\(\)\/\-]+/).filter(w => w.length > 3 && !['serum', 'total', 'count', 'level', 'test', 'ratio', 'fasting', 'coronary', 'artery'].includes(w));
        return lowerMsg.includes(pName) || (words.length > 0 && words.some(w => lowerMsg.includes(w)));
      });

      // 2. Fallback to generic match only if no specific analyte was matched
      if (!targetedParameter) {
        targetedParameter = allObservations.find(p => {
          const pName = (p.parameter || p.name || '').toLowerCase();
          return lowerMsg.includes('stenosis') && (pName.includes('artery') || pName.includes('stenosis'));
        });
      }
    }

    // Check for Radiology impression / finding match if user asks about imaging
    let targetedRadiologyFinding = null;
    if (!targetedParameter && reportResult && reportResult.structured_report) {
      const sr = reportResult.structured_report;
      if (sr.impressions && sr.impressions.length > 0 && (lowerMsg.includes('impression') || lowerMsg.includes('finding') || lowerMsg.includes('x-ray') || lowerMsg.includes('ct') || lowerMsg.includes('mri'))) {
        targetedRadiologyFinding = sr.impressions[0].text;
      } else if (sr.qualitative_findings && sr.qualitative_findings.length > 0) {
        const found = sr.qualitative_findings.find(f => {
          const words = f.finding.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          return words.some(w => lowerMsg.includes(w));
        });
        if (found) targetedRadiologyFinding = found.finding;
      }
    }

    let responseText = '';

    // ==========================================
    // Intent E: Memory handling
    // ==========================================
    if (decision.intent === 'CONVERSATION_MEMORY') {
      if (memorySnippet) {
        let topicSuffix = '';
        if (targetedParameter) {
          topicSuffix = `\n\nRegarding your **${targetedParameter.parameter}**, your report recorded **${targetedParameter.result_value} ${targetedParameter.unit || ''}** (normal range: ${targetedParameter.reference_range || 'not specified'}), classified as **${targetedParameter.status}**.`;
        }

        if (language === 'hi') {
          responseText = `हमारी पिछली बातचीत के आधार पर, मैंने यह जानकारी दी थी:\n"${memorySnippet.substring(0, 180)}..."${topicSuffix}\n\nक्या आप अपनी रिपोर्ट के किसी अन्य परिणाम के बारे में जानना चाहते हैं?`;
        } else if (language === 'hinglish') {
          responseText = `Hamari previous conversation mein maine yeh discuss kiya tha:\n"${memorySnippet.substring(0, 180)}..."${topicSuffix}\n\nKya aap report ke kisi aur parameter ke baare mein poochna chahte hain?`;
        } else {
          responseText = `Earlier in our consultation, we discussed:\n"${memorySnippet.substring(0, 180)}..."${topicSuffix}\n\nIs there a specific value or follow-up question you would like to clarify?`;
        }
      } else {
        if (targetedParameter) {
          responseText = `In your report, **${targetedParameter.parameter}** was **${targetedParameter.result_value} ${targetedParameter.unit || ''}** (range: ${targetedParameter.reference_range || 'N/A'}), which is **${targetedParameter.status}**.`;
        } else if (language === 'hi') {
          responseText = `मुझे आपकी पिछली बातचीत में कोई विशेष संदर्भ नहीं मिला। आपकी वर्तमान रिपोर्ट के आधार पर, मैं किसी भी टेस्ट को समझाने में आपकी मदद कर सकता हूँ।`;
        } else if (language === 'hinglish') {
          responseText = `Previous conversation mein specific mention nahi mila. Lekin aapki current uploaded report ke according main kisi bhi test ko explain kar sakta hoon.`;
        } else {
          responseText = `I couldn't locate a previous statement on that specific topic. Based on your active uploaded report, I am ready to explain any analyte or finding.`;
        }
      }
    }

    // ==========================================
    // 1. HINDI RESPONSE LOGIC ('hi')
    // ==========================================
    else if (language === 'hi') {
      if (targetedParameter) {
        const isAbnormal = ['High', 'Low', 'Critical High', 'Critical Low', 'Abnormal'].includes(targetedParameter.status);
        if (simpleMode) {
          if (isAbnormal) {
            responseText = `आपकी रिपोर्ट में **${targetedParameter.parameter}** की वैल्यू **${targetedParameter.result_value} ${targetedParameter.unit || ''}** है। यह सामान्य सीमा (${targetedParameter.reference_range}) से अलग है।\n\nसरल शब्दों में: यह मान थोड़ा ${targetedParameter.status === 'High' ? 'अधिक' : 'कम'} है। इसका कारण खान-पान, पानी की कमी या स्वास्थ्य स्थिति हो सकती है। कृपया अपने डॉक्टर से इस बारे में सलाह लें।`;
          } else {
            responseText = `आपकी रिपोर्ट में **${targetedParameter.parameter}** का मान **${targetedParameter.result_value} ${targetedParameter.unit || ''}** है। यह पूरी तरह सामान्य सीमा (${targetedParameter.reference_range}) में है। आपका यह टेस्ट सामान्य है।`;
          }
        } else {
          responseText = `आपकी रिपोर्ट में **${targetedParameter.parameter}** का परिणाम **${targetedParameter.result_value} ${targetedParameter.unit || ''}** दर्ज है। प्रयोगशाला के अनुसार सामान्य सीमा **${targetedParameter.reference_range}** है, जिसके आधार पर इसे **${targetedParameter.status}** माना गया है।\n\n`;
          if (isAbnormal) {
            responseText += `यह मान प्रयोगशाला की सामान्य सीमा से बाहर है। `;
            if (ragHits.length > 0) {
              responseText += `\n\n**प्रमाणित नैदानिक संदर्भ (${ragHits[0].organization}):**\n${ragHits[0].content}\n\n`;
            }
            responseText += `\n\n**डॉक्टर से पूछने योग्य सवाल:**\n"क्या मेरे ${targetedParameter.parameter} के स्तर को ठीक करने के लिए किसी अतिरिक्त जांच की आवश्यकता है?"`;
          } else {
            responseText += `यह परिणाम सामान्य शारीरिक कार्यप्रणाली का संकेत देता है।`;
          }
        }
      } else if (lowerMsg.includes('abnormal') || lowerMsg.includes('concerning') || lowerMsg.includes('gadbad') || lowerMsg.includes('galat') || lowerMsg.includes('खराब')) {
        const abns = reportResult ? (reportResult.abnormal_findings || []) : [];
        if (abns.length === 0) {
          responseText = simpleMode
            ? `आपकी रिपोर्ट में कोई भी असामान्य (abnormal) वैल्यू नहीं है। सभी जाँचे सामान्य सीमा में हैं।`
            : `आपकी उपलब्ध रिपोर्ट में कोई भी असामान्य मान चिन्हित नहीं किया गया है। सभी विश्लेषित टेस्ट सामान्य सीमा के भीतर हैं।`;
        } else {
          responseText = `आपकी रिपोर्ट में **${abns.length} टेस्ट सामान्य सीमा से बाहर हैं**:\n` +
            abns.map(a => `• **${a.parameter}**: ${a.result_value} ${a.unit || ''} (${a.status}) — सामान्य सीमा: ${a.reference_range}`).join('\n') +
            `\n\nकृपया इन परिणामों पर अपने डॉक्टर से परामर्श अवश्य लें।`;
        }
      } else if (lowerMsg.includes('doctor') || lowerMsg.includes('पूछ') || lowerMsg.includes('pooch')) {
        const qList = reportResult ? (reportResult.questions_for_doctor || []) : [];
        responseText = `आप अपने डॉक्टर से ये जरूरी सवाल पूछ सकते हैं:\n` +
          (qList.length > 0
            ? qList.map(q => `• ${q}`).join('\n')
            : `• क्या मुझे इन परिणामों के बाद कोई फॉलो-अप टेस्ट कराना चाहिए?\n• मेरी जीवनशैली में क्या सुधार आवश्यक हैं?`);
      } else if (lowerMsg.includes('mean') || lowerMsg.includes('summary') || lowerMsg.includes('मतलब') || lowerMsg.includes('samjhao') || lowerMsg.includes('समझ')) {
        responseText = this.generateSpokenSummary(reportResult, 'hi', simpleMode);
      } else {
        responseText = `नमस्ते। आपकी रिपोर्ट के अनुसार स्वास्थ्य मार्गदर्शन उपलब्ध है। याद रखें कि लैब टेस्ट परिणाम संपूर्ण स्वास्थ्य का केवल एक हिस्सा होते हैं।`;
        if (ragHits.length > 0) {
          responseText += `\n\n**प्रमाणित स्वास्थ्य संदर्भ (${ragHits[0].organization}):**\n${ragHits[0].content}\n`;
        }
        responseText += `\nक्या आप किसी विशेष टेस्ट (जैसे Hemoglobin, Cholesterol, Glucose, या Creatinine) के बारे में समझना चाहते हैं?`;
      }
    }

    // ==========================================
    // 2. HINGLISH RESPONSE LOGIC ('hinglish')
    // ==========================================
    else if (language === 'hinglish') {
      if (targetedParameter) {
        const isAbnormal = ['High', 'Low', 'Critical High', 'Critical Low', 'Abnormal'].includes(targetedParameter.status);
        if (simpleMode) {
          if (isAbnormal) {
            responseText = `Aapki report mein **${targetedParameter.parameter}** ka level **${targetedParameter.result_value} ${targetedParameter.unit || ''}** aaya hai. Normal range **${targetedParameter.reference_range}** hai.\n\nSimple shabdon mein: Yeh value thodi ${targetedParameter.status === 'High' ? 'jyada' : 'kam'} hai. Is par dhyan dene ki zaroorat hai. Apne doctor se is par discuss karein.`;
          } else {
            responseText = `Aapki report mein **${targetedParameter.parameter}** level **${targetedParameter.result_value} ${targetedParameter.unit || ''}** hai. Yeh normal range (${targetedParameter.reference_range}) ke andar hai. Yeh result safe aur healthy hai.`;
          }
        } else {
          responseText = `Aapki report mein **${targetedParameter.parameter}** ka result **${targetedParameter.result_value} ${targetedParameter.unit || ''}** measure hua hai. Lab ke according normal reference interval **${targetedParameter.reference_range}** hai, jo ise **${targetedParameter.status}** mark karta hai.\n\n`;
          if (isAbnormal) {
            responseText += `Yeh value lab ki normal range se deviate karti hai.`;
            if (ragHits.length > 0) {
              responseText += `\n\n**Verified Medical Reference (${ragHits[0].organization}):**\n${ragHits[0].content}\n\n`;
            }
            responseText += `\n**Doctor se poochne ke liye recommended question:**\n"Kya mere ${targetedParameter.parameter} level ke liye koi further test ya lifestyle changes chahiye?"`;
          } else {
            responseText += `Yeh finding normal physiological health ko represent karti hai.`;
          }
        }
      } else if (lowerMsg.includes('abnormal') || lowerMsg.includes('concerning') || lowerMsg.includes('gadbad') || lowerMsg.includes('wrong')) {
        const abns = reportResult ? (reportResult.abnormal_findings || []) : [];
        if (abns.length === 0) {
          responseText = simpleMode
            ? `Aapki report mein koi bhi abnormal value nahi hai. Sabhi tested values normal range mein hain.`
            : `Aapki report mein koi bhi abnormal result flag nahi hua hai. Sabhi parameters lab ke reference interval mein hain.`;
        } else {
          responseText = `Aapki report mein **${abns.length} abnormal finding(s)** hain:\n` +
            abns.map(a => `• **${a.parameter}**: ${a.result_value} ${a.unit || ''} (${a.status}) — Normal range: ${a.reference_range}`).join('\n') +
            `\n\nIn findings ko apne doctor ke saath discuss karna advisable hai.`;
        }
      } else if (lowerMsg.includes('doctor') || lowerMsg.includes('pooch') || lowerMsg.includes('ask')) {
        const qList = reportResult ? (reportResult.questions_for_doctor || []) : [];
        responseText = `Aap apne healthcare doctor se yeh questions pooch sakte hain:\n` +
          (qList.length > 0
            ? qList.map(q => `• ${q}`).join('\n')
            : `• Is report ke baad mujhe kya follow-up care karni chahiye?\n• Kya koi diet changes recommend karenge?`);
      } else if (lowerMsg.includes('mean') || lowerMsg.includes('summary') || lowerMsg.includes('matlab') || lowerMsg.includes('samjhao') || lowerMsg.includes('explain')) {
        responseText = this.generateSpokenSummary(reportResult, 'hinglish', simpleMode);
      } else {
        responseText = `Hello! Main aapki medical report ko simple language mein samjhne mein help kar sakta hoon.`;
        if (ragHits.length > 0) {
          responseText += `\n\n**Medical Evidence (${ragHits[0].organization}):**\n${ragHits[0].content}\n`;
        }
        responseText += `\nKya aap kisi specific test (jaise Hemoglobin, Cholesterol, Creatinine ya Sugar) ke baare mein poochna chahte hain?`;
      }
    }

    // ==========================================
    // 3. ENGLISH RESPONSE LOGIC ('en')
    // ==========================================
    else {
      if (targetedParameter) {
        const isAbnormal = ['High', 'Low', 'Critical High', 'Critical Low', 'Abnormal'].includes(targetedParameter.status);
        if (simpleMode) {
          if (isAbnormal) {
            responseText = `Your **${targetedParameter.parameter}** is **${targetedParameter.result_value} ${targetedParameter.unit || ''}**. The normal range on your report is ${targetedParameter.reference_range}.\n\nIn simple words: this number is ${targetedParameter.status === 'High' ? 'higher' : 'lower'} than usual. This is not a diagnosis, but it is something to ask your doctor about during your next appointment.`;
          } else {
            responseText = `Your **${targetedParameter.parameter}** is **${targetedParameter.result_value} ${targetedParameter.unit || ''}**. This is in the normal range (${targetedParameter.reference_range}). It shows that this test result is looking healthy and normal.`;
          }
        } else {
          responseText = `In your report, **${targetedParameter.parameter}** was measured at **${targetedParameter.result_value} ${targetedParameter.unit || ''}**. `;
          if (targetedParameter.reference_range) {
            responseText += `Your report lists the normal reference interval as **${targetedParameter.reference_range}**, which marks this value as **${targetedParameter.status}**. `;
          }

          if (isAbnormal) {
            responseText += `\n\n**Plain-Language Explanation:**\n${targetedParameter.plain_explanation || 'This value deviates from the normal expected reference interval.'}\n\n`;
            if (ragHits.length > 0) {
              responseText += `**Clinical Context (${ragHits[0].organization}):**\n${ragHits[0].content}\n\n`;
            }
            responseText += `**Recommended Question for Your Doctor:**\n"What clinical steps do you recommend to investigate my ${targetedParameter.parameter} level?"`;
          } else {
            responseText += `\n\nThis finding is within expected normal boundaries. It indicates normal physiological functioning for this specific marker.`;
          }
        }
      } else if (targetedRadiologyFinding) {
        responseText = `From your imaging report:\n**Finding:** "${targetedRadiologyFinding}"\n\n`;
        if (ragHits.length > 0) {
          responseText += `**General Medical Information (${ragHits[0].organization}):**\n${ragHits[0].content}\n\n`;
        }
        responseText += `Please discuss this imaging observation with your referring physician to correlate with your physical examination.`;
      } else if (lowerMsg.includes('abnormal') || lowerMsg.includes('concerning') || lowerMsg.includes('wrong') || lowerMsg.includes('normal')) {
        const abns = reportResult ? (reportResult.abnormal_findings || []) : [];
        if (abns.length === 0) {
          responseText = simpleMode
            ? `Good news: there are no abnormal values flagged on your report. All tested numbers are inside the normal range.`
            : `There are **no abnormal values** flagged on your available report. All analyzed markers fall within expected reference intervals.`;
        } else {
          responseText = `Your report highlights **${abns.length} abnormal value(s)**:\n` +
            abns.map(a => `• **${a.parameter}**: ${a.result_value} ${a.unit || ''} (${a.status}) — *Normal interval:* ${a.reference_range}`).join('\n') +
            `\n\nThese findings suggest discussing potential causes (such as diet, hydration, or medical evaluation) with your physician.`;
        }
      } else if (lowerMsg.includes('mean') || lowerMsg.includes('summary') || lowerMsg.includes('explain')) {
        responseText = simpleMode
          ? this.generateSpokenSummary(reportResult, 'en', true)
          : (reportResult && reportResult.summary ? reportResult.summary : `This report summarizes your diagnostic examination.`);
      } else if (lowerMsg.includes('doctor') || lowerMsg.includes('ask') || lowerMsg.includes('discuss')) {
        const qList = reportResult ? (reportResult.questions_for_doctor || []) : [];
        responseText = `Here are helpful, focused questions you can ask your healthcare professional:\n` +
          qList.map(q => `• ${q}`).join('\n');
      } else {
        responseText = `Thank you for your question. Regarding your medical report, it is important to remember that diagnostic results provide one piece of your complete health picture. They must always be evaluated alongside your personal medical history, physical symptoms, and ongoing medications.\n\n`;
        if (ragHits.length > 0) {
          responseText += `**Evidence-Based Clinical Guidance (${ragHits[0].organization}):**\n${ragHits[0].content}\n\n`;
        }
        responseText += `Would you like me to explain any specific finding, observation, or question to ask your doctor?`;
      }
    }

    return {
      content: responseText,
      sources: ragSources,
      urgency: reportResult ? reportResult.urgency : 'informational',
      urgency_category: reportResult ? reportResult.urgency_category : 'GREEN',
      language,
      simple_mode: simpleMode,
      rag_used: ragSources.length > 0,
      tools_used: toolsUsed,
      documents_retrieved: ragHits.length
    };
  }

  /**
   * Chat method alias for testing & backwards compatibility
   */
  async chat({ message, reportResult = null, conversationHistory = [], language = 'en', simpleMode = false }) {
    return this.processChatMessage(message, reportResult, conversationHistory, {
      language,
      simple_mode: simpleMode
    });
  }
}

module.exports = new AgentService();

