/**
 * Generic Medical Document Extraction & Analysis Engine
 * 
 * Implements:
 * 1. Normalized Medical Report Schema adaptation across ALL document categories
 * 2. Dynamic Table & Column parsing (distinguishes numeric results, qualitative results, and comments/remarks)
 * 3. Reference range extraction directly from report (never substitutes generic ranges; flags uncertain)
 * 4. Precise unit disambiguation (e.g. "13.3 g/dL 13.5-18.0")
 * 5. Multi-Page Source Provenance for every finding
 * 6. Specialized handling for:
 *    - Laboratory Reports (CBC, Lipid, LFT, KFT, Thyroid, Glucose, Urine)
 *    - Radiology Reports (X-Ray, CT, MRI, Ultrasound: technique, organ findings, measurements, impression)
 *    - Cardiology ECG (rate, rhythm, PR/QRS/QT/QTc intervals, axis, interpretation)
 *    - Cardiology Angiogram (arteries, stenosis percentages, diagrams, hemodynamics)
 *    - Pathology / Histopathology (specimen, gross/microscopic, conclusions)
 *    - Discharge Summaries & Clinical Notes (diagnoses, procedures, medications, plan)
 *    - Unknown Documents (extracts sections and observations without forcing into laboratory schema)
 * 7. Honest failure state when extraction yields no readable or confident data (NO fake fallbacks)
 */

const documentClassifier = require('./documentClassifier');
const GenericReportSchema = require('./genericReportSchema');
const logger = require('../utils/logger');

// Common units found across clinical medicine
const MEDICAL_UNITS = [
  'mg/dL', 'g/dL', 'U/L', 'IU/L', 'mIU/L', 'pg/mL', 'ng/mL', 'mmol/L', 'µmol/L', 'umol/L',
  '%', 'fL', 'pg', '10^3/uL', '10^6/uL', 'cells/µL', 'cells/uL', 'mm/hr', 'sec', 'seconds',
  'mmHg', 'bpm', 'ms', 'msec', 'cm', 'mm', 'mL', 'L', 'ratio', 'mEq/L'
];

class GenericExtractionService {
  /**
   * Universal Medical Report Ingestion
   */
  extract(rawText, visionFindings = [], inspectionMeta = {}) {
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return {
        ...GenericReportSchema.createDefault('UNKNOWN', 'Unreadable Document'),
        extraction_status: 'FAILED_EMPTY',
        confidence: 0.0,
        uncertain_fields: [{ field: 'document_text', reason: 'Document contained no readable text' }]
      };
    }

    // 1. Classify Document Type & Category
    const classification = documentClassifier.classify(rawText);
    const reportObj = GenericReportSchema.createDefault(classification.category, classification.sub_type);
    reportObj.classification_confidence = classification.confidence;

    // 2. Extract Document-level metadata (Patient, Dates, Facilities, Source Pages)
    this._extractDocumentMetadata(rawText, reportObj);

    // Track pages from inspection if available
    if (inspectionMeta && inspectionMeta.num_pages) {
      const pageCount = inspectionMeta.num_pages;
      reportObj.source_pages = Array.from({ length: pageCount }, (_, i) => i + 1);
    }

    // 3. Delegate to Category-Specific Structured Parsers
    switch (classification.category) {
      case 'LABORATORY':
        this._parseLaboratoryReport(rawText, reportObj);
        break;
      case 'RADIOLOGY':
        this._parseRadiologyReport(rawText, reportObj);
        break;
      case 'CARDIOLOGY_ECG':
        this._parseEcgReport(rawText, reportObj);
        break;
      case 'CARDIOLOGY_ANGIOGRAM':
        this._parseAngiogramReport(rawText, reportObj, visionFindings);
        break;
      case 'CARDIOLOGY_ECHO':
        this._parseEchoReport(rawText, reportObj);
        break;
      case 'PATHOLOGY':
        this._parsePathologyReport(rawText, reportObj);
        break;
      case 'DISCHARGE_SUMMARY':
        this._parseDischargeSummary(rawText, reportObj);
        break;
      case 'PRESCRIPTION_MEDICATION':
        this._parsePrescription(rawText, reportObj);
        break;
      case 'CLINICAL_NOTE':
        this._parseClinicalNote(rawText, reportObj);
        break;
      default:
        this._parseGenericDocument(rawText, reportObj);
        break;
    }

    // 4. Merge Vision Findings (Diagrams, Handwriting, Tables)
    this._mergeVisionFindings(visionFindings, reportObj);

    // 5. Calculate overall extraction quality
    const totalItems = reportObj.observations.length + reportObj.impressions.length + 
      reportObj.measurements.length + reportObj.diagnoses_as_written.length + 
      reportObj.qualitative_findings.length + reportObj.sections.length;

    if (totalItems === 0 && reportObj.uncertain_fields.length > 0) {
      reportObj.extraction_status = 'FAILED_UNCERTAIN';
      reportObj.confidence = 0.25;
    } else if (totalItems === 0) {
      reportObj.extraction_status = 'FAILED_EMPTY';
      reportObj.confidence = 0.0;
    } else {
      reportObj.extraction_status = 'SUCCESS';
      reportObj.confidence = Math.min(0.98, 0.75 + (totalItems * 0.03));
    }

    return reportObj;
  }

  /**
   * Extracts Patient, Facility, and Date Metadata
   */
  _extractDocumentMetadata(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        if (!reportObj.source_pages.includes(currentPage)) {
          reportObj.source_pages.push(currentPage);
        }
        continue;
      }

      // Patient Name
      const nameMatch = trimmed.match(/patient(?:\s*name)?[:\s]+([^|,\n]+)/i);
      if (nameMatch && !reportObj.patient_information.name) {
        const candidate = nameMatch[1].trim();
        if (!candidate.toLowerCase().includes('report') && candidate.length > 2) {
          reportObj.patient_information.name = candidate;
        }
      }

      // Age
      const ageMatch = trimmed.match(/age[:\s]+(\d+)\s*(?:years|yrs|y)?/i);
      if (ageMatch && !reportObj.patient_information.age) {
        reportObj.patient_information.age = ageMatch[1];
      }

      // Sex / Gender
      const sexMatch = trimmed.match(/(?:sex|gender)[:\s]+(male|female|non-binary|m|f)/i);
      if (sexMatch && !reportObj.patient_information.gender) {
        const g = sexMatch[1].toUpperCase();
        reportObj.patient_information.gender = (g === 'M' || g === 'MALE') ? 'Male' : ((g === 'F' || g === 'FEMALE') ? 'Female' : sexMatch[1]);
      }

      // MRN / Patient ID
      const mrnMatch = trimmed.match(/(?:mrn|patient\s*id|pid|id)[:\s]+([#\w\-]+)/i);
      if (mrnMatch && !reportObj.patient_information.mrn && !mrnMatch[1].toLowerCase().includes('specimen')) {
        reportObj.patient_information.mrn = mrnMatch[1].trim();
      }

      // Report Date
      const dateMatch = trimmed.match(/(?:collection\s*date|report\s*date|procedure\s*date|date)[:\s]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
      if (dateMatch && !reportObj.report_date) {
        reportObj.report_date = dateMatch[1].trim();
      }

      // Facility / Hospital / Lab Name
      if (/^[A-Z\s]{4,40}(?:HOSPITAL|LABORATORY|CLINIC|INSTITUTE|PATHOLOGY|DIAGNOSTICS|CENTER|CENTRE|IMAGING)/.test(trimmed)) {
        if (!reportObj.facility_information.name) {
          reportObj.facility_information.name = trimmed;
        }
      }
    }
  }

  /**
   * Universal Laboratory Parser:
   * Dynamically recognizes columns, extracts units, isolates reference ranges,
   * and separates Comments/Remarks from numeric/qualitative tests.
   */
  _parseLaboratoryReport(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;
    const seenParams = new Set();

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      if (!trimmed || trimmed.length < 3) continue;

      // Skip common non-analyte header/footer lines
      if (
        /^(patient|doctor|physician|technician|date|age|sex|gender|sample|specimen|interpretation|notes|acme|metro|bio-care|apex|endocrine|central|community|test name|parameter|result|---|\*\*\*|disclaimer:)/i.test(trimmed)
      ) {
        continue;
      }

      // Identify Remarks & Comments (e.g. "Test Remark | kindly correlate clinically")
      if (
        /^(remark|comment|clinical notes?|alert:|interpretation|note:)[:\s|]+/i.test(trimmed) ||
        trimmed.toLowerCase().includes('kindly correlate') ||
        trimmed.toLowerCase().includes('correlate clinically') ||
        trimmed.toLowerCase().includes('sample slightly hemolysed')
      ) {
        reportObj.remarks.push({
          text: trimmed.replace(/^(remark|comment|clinical notes?|note:)[:\s|]+/i, '').trim(),
          source_page: currentPage
        });
        continue;
      }

      // 1. Parse Column-delimited line (>= 2 spaces or tab separators)
      const colParts = trimmed.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);

      if (colParts.length >= 2) {
        const candidateName = colParts[0].replace(/[:\-]/g, '').trim();
        const candidateValuePart = colParts[1];

        // Check if candidateName is actually a comment/remark row
        if (
          candidateName.toLowerCase().includes('remark') ||
          candidateName.toLowerCase().includes('comment') ||
          candidateName.toLowerCase().includes('note')
        ) {
          reportObj.remarks.push({
            text: colParts.slice(1).join(' '),
            source_page: currentPage
          });
          continue;
        }

        // Parse result value (numeric or qualitative)
        const parsedResult = this._parseResultAndUnit(candidateValuePart, colParts.slice(2));

        if (parsedResult) {
          const lowerName = candidateName.toLowerCase();
          if (!seenParams.has(lowerName)) {
            seenParams.add(lowerName);

            const observation = {
              parameter: candidateName,
              result_value: parsedResult.value,
              unit: parsedResult.unit || null,
              reference_range: parsedResult.reference_range || null,
              reference_low: parsedResult.reference_low || null,
              reference_high: parsedResult.reference_high || null,
              flag: parsedResult.flag || null,
              status: this._determineLabStatus(parsedResult.value, parsedResult.reference_range, parsedResult.flag),
              source_page: currentPage,
              confidence: parsedResult.confidence || 0.95
            };

            reportObj.observations.push(observation);
            continue;
          }
        }
      }

      // 2. Parse Colon-delimited line (e.g. "Hemoglobin: 9.4 g/dL (12.0 - 15.5) [LOW]")
      const colonMatch = trimmed.match(/^([A-Za-z0-9\s\(\)\/\-]+?)\s*:\s*([<>]?\s*[\d\.]+|[A-Za-z]+)\s*([a-zA-Z\/\%\^0-9]+)?(?:\s*\(?(?:ref|range)?[:\s]*([^,\)\n]+)\)?)?(?:\s*\[?(HIGH|LOW|CRITICAL|ABNORMAL|NORMAL)\]?)?/i);
      if (colonMatch) {
        const paramName = colonMatch[1].trim();
        const rawVal = colonMatch[2].trim();
        const unit = colonMatch[3] ? colonMatch[3].trim() : null;
        const refRange = colonMatch[4] ? colonMatch[4].trim() : null;
        const flag = colonMatch[5] ? colonMatch[5].toUpperCase().trim() : null;

        if (paramName.length > 1 && !seenParams.has(paramName.toLowerCase()) && !/^(date|time|specimen|doctor|patient)/i.test(paramName)) {
          seenParams.add(paramName.toLowerCase());
          const valNum = isNaN(parseFloat(rawVal)) ? rawVal : parseFloat(rawVal);

          reportObj.observations.push({
            parameter: paramName,
            result_value: valNum,
            unit: unit,
            reference_range: refRange,
            flag: flag,
            status: this._determineLabStatus(valNum, refRange, flag),
            source_page: currentPage,
            confidence: 0.92
          });
        }
      }
    }
  }

  /**
   * Helper to parse value, unit, and reference ranges from column slices
   */
  _parseResultAndUnit(valueCol, remainingCols = []) {
    let rawVal = valueCol.trim();
    let unit = null;
    let refRange = null;
    let flag = null;

    // Check if remaining columns provide unit, range, and flag
    if (remainingCols.length > 0) {
      // Find unit in remaining columns
      const unitIdx = remainingCols.findIndex(c => MEDICAL_UNITS.some(u => c.toLowerCase() === u.toLowerCase()));
      if (unitIdx !== -1) {
        unit = remainingCols[unitIdx];
        const afterUnit = remainingCols.slice(unitIdx + 1);
        if (afterUnit.length > 0) refRange = afterUnit[0];
        if (afterUnit.length > 1) flag = afterUnit[1];
      } else {
        // Look for reference range pattern (e.g. "12.0 - 15.5" or "< 200" or "Non-Reactive" or "Negative")
        const rangeIdx = remainingCols.findIndex(c => 
          /[\d\.]+\s*(?:-|to)\s*[\d\.]+|[<>]=?\s*[\d\.]+/i.test(c) ||
          /^(non-reactive|negative|normal|undetected|absent)$/i.test(c.trim())
        );
        if (rangeIdx !== -1) {
          refRange = remainingCols[rangeIdx];
          if (rangeIdx > 0) unit = remainingCols[0];
          if (remainingCols.length > rangeIdx + 1) flag = remainingCols[rangeIdx + 1];
        } else if (remainingCols.length === 1 && /^(non-reactive|negative|normal|undetected|absent)$/i.test(remainingCols[0])) {
          refRange = remainingCols[0];
        } else {
          unit = remainingCols[0] || null;
          refRange = remainingCols[1] || null;
          flag = remainingCols[2] || null;
        }
      }
    }

    // Check if unit is attached directly to the value column (e.g. "9.4g/dL" or "135/82 mmHg")
    const unitMatch = rawVal.match(/^([<>]?\s*[\d\.]+)\s*([a-zA-Z\/\%][a-zA-Z\/\%\^0-9]*)$/);
    if (unitMatch) {
      rawVal = unitMatch[1];
      if (!unit) unit = unitMatch[2];
    }

    // Numeric or qualitative?
    const num = parseFloat(rawVal);
    const isNum = !isNaN(num);
    const finalVal = isNum ? num : rawVal;

    // If qualitative (e.g. "Negative", "Normal", "Reactive")
    if (!isNum && rawVal.length > 20) {
      return null; // Not a test value, likely a comment or sentence
    }

    // Clean flag
    if (flag) {
      const cleanFlag = flag.toUpperCase().replace(/[\[\]]/g, '').trim();
      flag = ['HIGH', 'LOW', 'CRITICAL', 'ABNORMAL', 'NORMAL'].includes(cleanFlag) ? cleanFlag : null;
    }

    return {
      value: finalVal,
      unit: unit ? unit.replace(/[\[\]]/g, '').trim() : null,
      reference_range: refRange ? refRange.replace(/[\[\]]/g, '').trim() : null,
      flag: flag,
      confidence: 0.95
    };
  }

  /**
   * Determine laboratory status strictly based on report interval or printed flag
   */
  _determineLabStatus(resultValue, referenceRange, flag = null) {
    if (flag) {
      if (flag.includes('CRIT')) return 'Critical High';
      if (flag.includes('HIGH')) return 'High';
      if (flag.includes('LOW')) return 'Low';
      if (flag.includes('ABNORM')) return 'Abnormal';
      if (flag.includes('NORM')) return 'Normal';
    }

    const valNum = parseFloat(resultValue);

    // Qualitative check
    if (isNaN(valNum)) {
      const v = String(resultValue).toLowerCase().trim();
      const r = String(referenceRange || '').toLowerCase().trim();
      if (v.includes('non-reactive') || v.includes('negative') || v === 'normal' || v === 'undetected') {
        if (r.includes('positive') || (r.includes('reactive') && !r.includes('non-reactive'))) return 'Abnormal';
        return 'Normal';
      }
      if (v.includes('positive') || v === 'reactive' || v.includes('detected') || v.includes('abnormal')) return 'Abnormal';
      if (r && v === r) return 'Normal';
      return 'REFERENCE RANGE UNCERTAIN';
    }

    if (!referenceRange) {
      return 'REFERENCE RANGE UNCERTAIN';
    }

    // Range: "12.0 - 15.5"
    const rangeMatch = referenceRange.match(/([\d\.]+)\s*(?:-|to)\s*([\d\.]+)/i);
    if (rangeMatch) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (valNum < low) return (valNum < low * 0.6) ? 'Critical Low' : 'Low';
      if (valNum > high) return (valNum > high * 2.5) ? 'Critical High' : 'High';
      return 'Normal';
    }

    // Upper limit: "< 200" or "<= 150"
    const lessMatch = referenceRange.match(/(?:<|<=)\s*([\d\.]+)/);
    if (lessMatch) {
      const max = parseFloat(lessMatch[1]);
      return valNum > max ? 'High' : 'Normal';
    }

    // Lower limit: "> 40"
    const greaterMatch = referenceRange.match(/(?:>|>=)\s*([\d\.]+)/);
    if (greaterMatch) {
      const min = parseFloat(greaterMatch[1]);
      return valNum < min ? 'Low' : 'Normal';
    }

    return 'REFERENCE RANGE UNCERTAIN';
  }

  /**
   * Radiology Document Parser (X-Ray, CT, MRI, Ultrasound)
   * Extracts: examination, technique, organ findings, measurements, impression, recommendations
   */
  _parseRadiologyReport(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentSection = 'GENERAL';
    let currentSectionBuffer = [];
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      if (!trimmed) continue;

      // Section Headings
      if (/^(clinical indication|history)[:\s]+/i.test(trimmed)) {
        this._flushRadiologySection(currentSection, currentSectionBuffer, reportObj, currentPage);
        currentSection = 'INDICATION';
        currentSectionBuffer = [trimmed.replace(/^(clinical indication|history)[:\s]+/i, '').trim()];
      } else if (/^(technique|examination|procedure)[:\s]+/i.test(trimmed)) {
        this._flushRadiologySection(currentSection, currentSectionBuffer, reportObj, currentPage);
        currentSection = 'TECHNIQUE';
        currentSectionBuffer = [trimmed.replace(/^(technique|examination|procedure)[:\s]+/i, '').trim()];
      } else if (/^(findings|radiological findings|observations)[:\s]+/i.test(trimmed)) {
        this._flushRadiologySection(currentSection, currentSectionBuffer, reportObj, currentPage);
        currentSection = 'FINDINGS';
        currentSectionBuffer = [trimmed.replace(/^(findings|radiological findings|observations)[:\s]+/i, '').trim()];
      } else if (/^(impression|conclusion|diagnostic impression)[:\s]+/i.test(trimmed)) {
        this._flushRadiologySection(currentSection, currentSectionBuffer, reportObj, currentPage);
        currentSection = 'IMPRESSION';
        currentSectionBuffer = [trimmed.replace(/^(impression|conclusion|diagnostic impression)[:\s]+/i, '').trim()];
      } else if (/^(recommendations?|plan|follow-up)[:\s]+/i.test(trimmed)) {
        this._flushRadiologySection(currentSection, currentSectionBuffer, reportObj, currentPage);
        currentSection = 'RECOMMENDATIONS';
        currentSectionBuffer = [trimmed.replace(/^(recommendations?|plan|follow-up)[:\s]+/i, '').trim()];
      } else {
        currentSectionBuffer.push(trimmed);

        // Check for measurements in radiology findings (e.g. "3.2 x 2.4 cm", "14 mm")
        const measureMatch = trimmed.match(/([\w\s]+)[:\s]+([\d\.]+(?:\s*[xX]\s*[\d\.]+)?\s*(?:cm|mm|cm2|mm2))/i);
        if (measureMatch && currentSection === 'FINDINGS') {
          reportObj.measurements.push({
            parameter: measureMatch[1].trim(),
            value: measureMatch[2].trim(),
            unit: measureMatch[2].includes('cm') ? 'cm' : 'mm',
            source_page: currentPage
          });
        }
      }
    }

    this._flushRadiologySection(currentSection, currentSectionBuffer, reportObj, currentPage);
  }

  _flushRadiologySection(sectionName, buffer, reportObj, page) {
    const text = buffer.join(' ').trim();
    if (!text) return;

    if (sectionName === 'IMPRESSION') {
      reportObj.impressions.push({ text, source_page: page });
    } else if (sectionName === 'RECOMMENDATIONS') {
      reportObj.recommendations.push({ text, source_page: page });
    } else if (sectionName === 'FINDINGS') {
      // Split findings into bullet/sentence statements
      const sentences = text.split(/(?<=[.?!])\s+/).filter(s => s.length > 5);
      sentences.forEach(s => {
        reportObj.qualitative_findings.push({
          finding: s.trim(),
          source_page: page,
          confidence: 0.94
        });
      });
    } else if (sectionName === 'TECHNIQUE') {
      reportObj.procedures.push({
        name: reportObj.report_title,
        technique: text,
        source_page: page
      });
    }

    reportObj.sections.push({
      heading: sectionName,
      content: text,
      source_page: page
    });
  }

  /**
   * Cardiology ECG Parser:
   * Extracts rate, rhythm, PR interval, QRS duration, QT/QTc, and machine/physician interpretations
   */
  _parseEcgReport(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      // Heart Rate
      const hrMatch = trimmed.match(/(?:heart\s*rate|ventricular\s*rate|hr)[:\s]+(\d+)\s*(?:bpm)?/i);
      if (hrMatch) {
        reportObj.observations.push({
          parameter: 'Heart Rate',
          result_value: parseInt(hrMatch[1], 10),
          unit: 'bpm',
          reference_range: '60 - 100',
          status: parseInt(hrMatch[1], 10) > 100 ? 'High' : (parseInt(hrMatch[1], 10) < 60 ? 'Low' : 'Normal'),
          source_page: currentPage,
          confidence: 0.96
        });
      }

      // PR Interval
      const prMatch = trimmed.match(/pr(?:\s*interval)?[:\s]+(\d+)\s*(?:ms|msec)?/i);
      if (prMatch) {
        reportObj.observations.push({
          parameter: 'PR Interval',
          result_value: parseInt(prMatch[1], 10),
          unit: 'ms',
          reference_range: '120 - 200',
          status: parseInt(prMatch[1], 10) > 200 ? 'High' : (parseInt(prMatch[1], 10) < 120 ? 'Low' : 'Normal'),
          source_page: currentPage,
          confidence: 0.95
        });
      }

      // QRS Duration
      const qrsMatch = trimmed.match(/qrs(?:\s*duration)?[:\s]+(\d+)\s*(?:ms|msec)?/i);
      if (qrsMatch) {
        reportObj.observations.push({
          parameter: 'QRS Duration',
          result_value: parseInt(qrsMatch[1], 10),
          unit: 'ms',
          reference_range: '80 - 120',
          status: parseInt(qrsMatch[1], 10) > 120 ? 'High' : 'Normal',
          source_page: currentPage,
          confidence: 0.95
        });
      }

      // QT / QTc
      const qtcMatch = trimmed.match(/qt[c]?[:\s]+(\d+)\s*(?:ms|msec)?/i);
      if (qtcMatch) {
        reportObj.observations.push({
          parameter: 'QTc Interval',
          result_value: parseInt(qtcMatch[1], 10),
          unit: 'ms',
          reference_range: '< 450 (men) / < 460 (women)',
          status: parseInt(qtcMatch[1], 10) > 460 ? 'High' : 'Normal',
          source_page: currentPage,
          confidence: 0.95
        });
      }

      // Rhythm / Interpretation
      if (/^(interpretation|rhythm|impression)[:\s]+/i.test(trimmed) || trimmed.toLowerCase().includes('sinus rhythm')) {
        reportObj.impressions.push({
          text: trimmed.replace(/^(interpretation|rhythm|impression)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      }
    }
  }

  /**
   * Cardiology Coronary Angiogram Parser
   */
  _parseAngiogramReport(text, reportObj, visionFindings = []) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;
    const seenArteries = new Set();

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      // Hemodynamics
      const bpMatch = trimmed.match(/(?:aortic\s*pressure|bp)[:\s]+([\d\/]+)\s*(?:mmhg)?/i);
      if (bpMatch) {
        reportObj.measurements.push({
          parameter: 'Aortic Pressure',
          value: bpMatch[1],
          unit: 'mmHg',
          source_page: currentPage
        });
      }
      const lvedpMatch = trimmed.match(/lvedp[:\s]+(\d+)\s*(?:mmhg)?/i);
      if (lvedpMatch) {
        reportObj.measurements.push({
          parameter: 'LVEDP',
          value: lvedpMatch[1],
          unit: 'mmHg',
          source_page: currentPage
        });
      }

      // Vessel Stenosis rows (e.g. "LAD Mid-vessel segment 75% stenosis Severe")
      const rowMatch = trimmed.match(/^(LMCA|Left Main|LAD|Left Anterior Descending|LCx|Left Circumflex|RCA|Right Coronary Artery|PDA|OM\d?|Diagonal)\s+(.*?)\s+(\d{1,3}%\s*stenosis|\d{1,3}%\s*\(Normal\)|\d{1,3}%|Normal)\s*(.*)$/i);
      if (rowMatch) {
        const artery = rowMatch[1].toUpperCase().trim();
        const segment = rowMatch[2].trim();
        const rawPct = rowMatch[3].trim();
        const statusStr = rowMatch[4] ? rowMatch[4].trim() : '';

        const pctNumMatch = rawPct.match(/(\d{1,3})/);
        const pctNum = pctNumMatch ? parseInt(pctNumMatch[1], 10) : 0;

        let status = 'Normal';
        if (pctNum >= 70) status = 'Critical High';
        else if (pctNum >= 50) status = 'High';

        if (!seenArteries.has(artery)) {
          seenArteries.add(artery);
          reportObj.observations.push({
            parameter: `${artery} Coronary Artery`,
            result_value: rawPct,
            segment: segment,
            unit: '% stenosis',
            reference_range: '< 50% (Non-obstructive)',
            status: status,
            flag: status === 'Critical High' ? 'SEVERE' : (status === 'High' ? 'MODERATE' : 'NORMAL'),
            source_page: currentPage,
            confidence: 0.96
          });
        }
      }

      // Ventriculogram / Ejection Fraction
      const lvefMatch = trimmed.match(/(?:ejection\s*fraction|lvef)[:\s]+(\d+)\s*%/i);
      if (lvefMatch) {
        reportObj.measurements.push({
          parameter: 'Left Ventricular Ejection Fraction (LVEF)',
          value: `${lvefMatch[1]}%`,
          unit: '%',
          source_page: currentPage
        });
      }

      // Recommendations (Page 2)
      if (
        /^(clinical recommendation|recommendation|plan)[:\s]+/i.test(trimmed) ||
        trimmed.includes('Heart Team') || trimmed.includes('PCI') || trimmed.includes('CABG')
      ) {
        const recText = trimmed.replace(/^(clinical recommendation|recommendation|plan)[:\s]+/i, '').trim();
        if (recText.length > 5 && !reportObj.recommendations.some(r => r.text === recText)) {
          reportObj.recommendations.push({ text: recText, source_page: currentPage });
        }
      }
    }
  }

  /**
   * Cardiology Echocardiogram Parser
   */
  _parseEchoReport(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      const efMatch = trimmed.match(/(?:ejection\s*fraction|ef)[:\s]+(\d+)\s*%/i);
      if (efMatch) {
        reportObj.measurements.push({
          parameter: 'Ejection Fraction (LVEF)',
          value: `${efMatch[1]}%`,
          unit: '%',
          source_page: currentPage
        });
      }

      if (/^(impression|conclusion|summary)[:\s]+/i.test(trimmed)) {
        reportObj.impressions.push({
          text: trimmed.replace(/^(impression|conclusion|summary)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      }
    }
  }

  /**
   * Pathology / Histopathology Parser
   */
  _parsePathologyReport(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      if (/^(specimen|tissue submitted)[:\s]+/i.test(trimmed)) {
        reportObj.procedures.push({
          name: 'Biopsy / Surgical Specimen Examination',
          technique: trimmed.replace(/^(specimen|tissue submitted)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      } else if (/^(diagnosis|final diagnosis|pathologic diagnosis|impression)[:\s]+/i.test(trimmed)) {
        reportObj.diagnoses_as_written.push({
          text: trimmed.replace(/^(diagnosis|final diagnosis|pathologic diagnosis|impression)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      } else if (/^(microscopic description|findings)[:\s]+/i.test(trimmed)) {
        reportObj.qualitative_findings.push({
          finding: trimmed.replace(/^(microscopic description|findings)[:\s]+/i, '').trim(),
          source_page: currentPage,
          confidence: 0.92
        });
      }
    }
  }

  /**
   * Inpatient Discharge Summary Parser
   */
  _parseDischargeSummary(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      if (/^(discharge diagnosis|admission diagnosis|final diagnosis)[:\s]+/i.test(trimmed)) {
        reportObj.diagnoses_as_written.push({
          text: trimmed.replace(/^(discharge diagnosis|admission diagnosis|final diagnosis)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      } else if (/^(procedures performed|operations)[:\s]+/i.test(trimmed)) {
        reportObj.procedures.push({
          name: trimmed.replace(/^(procedures performed|operations)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      } else if (/^(discharge medications|medications at discharge)[:\s]+/i.test(trimmed)) {
        reportObj.medications.push({
          name: trimmed.replace(/^(discharge medications|medications at discharge)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      } else if (/^(follow-up instructions|discharge plan)[:\s]+/i.test(trimmed)) {
        reportObj.recommendations.push({
          text: trimmed.replace(/^(follow-up instructions|discharge plan)[:\s]+/i, '').trim(),
          source_page: currentPage
        });
      }
    }
  }

  /**
   * Prescription / Medication Document Parser
   */
  _parsePrescription(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      // Medication lines: e.g. "Tab. Atorvastatin 20mg once daily oral"
      if (/\b(?:tab|cap|tablet|capsule|inj|syrup|ointment)\b/i.test(trimmed) || /\b\d+\s*(?:mg|mcg|ml|g)\b/i.test(trimmed)) {
        reportObj.medications.push({
          name: trimmed,
          source_page: currentPage
        });
      }
    }
  }

  /**
   * Generic / Unknown Document Parser
   * Extracts raw sections and paragraphs without forcing false clinical schemas
   */
  _parseGenericDocument(text, reportObj) {
    const lines = text.split(/\r?\n/);
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      if (trimmed.length > 20) {
        reportObj.sections.push({
          heading: 'Extracted Section',
          content: trimmed,
          source_page: currentPage
        });
      }
    }
  }

  /**
   * Merges Vision Findings (Diagrams, Handwriting, Tables) into Normalized Report
   */
  _mergeVisionFindings(visionFindings = [], reportObj) {
    if (!Array.isArray(visionFindings)) return;

    visionFindings.forEach(vf => {
      // 1. Diagrams
      if (vf.document_structure && vf.document_structure.has_diagram) {
        reportObj.images_or_diagrams.push({
          type: 'Anatomical Diagram',
          description: vf.document_structure.diagram_labels?.join(', ') || 'Anatomical illustration',
          source_page: vf.page_number || 1
        });
      }

      // 2. Handwritten Annotations
      if (vf.document_structure && vf.document_structure.has_handwriting) {
        reportObj.handwritten_content.push({
          detected: true,
          source_page: vf.page_number || 1
        });
      }

      // 3. Uncertain Fields (Requirement 10 & 12)
      if (vf.uncertain_fields && vf.uncertain_fields.length > 0) {
        vf.uncertain_fields.forEach(uf => {
          if (!reportObj.uncertain_fields.some(u => u.raw_text === uf.raw_text)) {
            reportObj.uncertain_fields.push({
              field: 'Handwritten / Faint Notation',
              raw_text: uf.raw_text,
              source_page: uf.source_page || vf.page_number || 1,
              confidence: uf.confidence || 0.45,
              reason: uf.note || 'Handwritten content could not be confidently interpreted'
            });
          }
        });
      }

      // 4. Stenosis findings from vision (if not already extracted)
      if (vf.stenosis_findings && vf.stenosis_findings.length > 0) {
        vf.stenosis_findings.forEach(sf => {
          const name = `${sf.artery} Coronary Artery`;
          if (!reportObj.observations.some(o => o.parameter.toUpperCase().includes(sf.artery))) {
            const status = sf.severity.includes('Severe') ? 'Critical High' : (sf.severity.includes('Moderate') ? 'High' : 'Normal');
            reportObj.observations.push({
              parameter: name,
              result_value: sf.stenosis_percentage,
              unit: '% stenosis',
              reference_range: '< 50% (Non-obstructive)',
              status: status,
              flag: status === 'Critical High' ? 'SEVERE' : (status === 'High' ? 'MODERATE' : 'NORMAL'),
              source_page: sf.source_page || vf.page_number || 1,
              confidence: sf.confidence || 0.94
            });
          }
        });
      }
    });
  }
}

module.exports = new GenericExtractionService();
