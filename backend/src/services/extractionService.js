/**
 * Medical Report Extraction Service (Tool 1)
 * 
 * Supports:
 * 1. Routine Clinical Laboratory Panels (CBC, Lipid, LFT, KFT, Thyroid, Glucose, Urine)
 * 2. Scanned, Handwritten & Image-Based Diagnostic Reports
 * 3. Multi-Page Coronary Angiogram Reports (Arteries, Branches, Stenosis %, Tables, Diagrams, Recommendations)
 * 4. Page Provenance & Uncertainty Flagging
 */

const documentClassifier = require('./documentClassifier');
const genericExtractionService = require('./genericExtractionService');
const logger = require('../utils/logger');

class ExtractionService {
  /**
   * Identifies report type based on generic classifier
   */
  detectReportType(text) {
    const res = documentClassifier.classify(text);
    return res.sub_type || res.category || 'General Medical Document';
  }

  /**
   * Universal parameter extraction (Laboratory + Cardiology + Radiology + Other)
   */
  extractParameters(rawText, visionFindings = [], inspection = {}) {
    const report = genericExtractionService.extract(rawText, visionFindings, inspection);
    return report.observations || [];
  }

  /**
   * Returns complete generic normalized medical report
   */
  extractFullReport(rawText, visionFindings = [], inspection = {}) {
    return genericExtractionService.extract(rawText, visionFindings, inspection);
  }

  /**
   * Structured extraction of Coronary Angiogram reports
   */
  extractAngiogramData(rawText, visionFindings = []) {
    const lines = rawText.split(/\r?\n/);
    const data = {
      patient_information: {},
      procedure: {
        type: 'Coronary Angiography (Cardiac Catheterization)',
        approach: 'Right Radial Artery'
      },
      clinical_diagnosis: {
        indication: 'Coronary Artery Disease Evaluation / Angina'
      },
      arteries: [],
      branches: [],
      stenosis_findings: [],
      measurements: [],
      comments: [],
      recommendations: [],
      uncertain_fields: [],
      source_pages: []
    };

    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        if (!data.source_pages.includes(currentPage)) {
          data.source_pages.push(currentPage);
        }
        continue;
      }

      // Patient Information extraction
      const patientMatch = trimmed.match(/patient\s*(?:name)?[:\s]+([^|,\n]+)/i);
      if (patientMatch && !data.patient_information.name) {
        data.patient_information.name = patientMatch[1].trim();
      }
      const ageMatch = trimmed.match(/age[:\s]+(\d+)/i);
      if (ageMatch && !data.patient_information.age) {
        data.patient_information.age = ageMatch[1];
      }
      const sexMatch = trimmed.match(/sex[:\s]+(male|female|m|f)/i);
      if (sexMatch && !data.patient_information.sex) {
        data.patient_information.sex = sexMatch[1].toUpperCase();
      }

      // Approach & hemodynamics
      if (/approach[:\s]+([^|\n]+)/i.test(trimmed)) {
        data.procedure.approach = trimmed.match(/approach[:\s]+([^|\n]+)/i)[1].trim();
      }
      if (/indication[:\s]+([^|\n]+)/i.test(trimmed)) {
        data.clinical_diagnosis.indication = trimmed.match(/indication[:\s]+([^|\n]+)/i)[1].trim();
      }

      // Hemodynamic measurements
      const aorticPressureMatch = trimmed.match(/(?:aortic\s*pressure|bp|ao)[:\s]+([\d\/]+)\s*(?:mmhg)?/i);
      if (aorticPressureMatch) {
        data.measurements.push({
          parameter: 'Aortic Pressure',
          value: aorticPressureMatch[1],
          unit: 'mmHg',
          source_page: currentPage,
          confidence: 0.95
        });
      }
      const lvedpMatch = trimmed.match(/lvedp[:\s]+(\d+)\s*(?:mmhg)?/i);
      if (lvedpMatch) {
        data.measurements.push({
          parameter: 'LVEDP (Left Ventricular End-Diastolic Pressure)',
          value: lvedpMatch[1],
          unit: 'mmHg',
          source_page: currentPage,
          confidence: 0.95
        });
      }

      // Coronary Artery Stenosis Findings
      const arteryPattern = /^(LMCA|Left Main|LAD|Left Anterior Descending|LCx|Left Circumflex|RCA|Right Coronary Artery|PDA|OM1|OM2|Diagonal)[\s\:\-]+([<>]?\s*\d{1,3}(?:\s*-\s*\d{1,3})?%?|[A-Za-z\s]+)(?:[\s,]+(.*))?$/i;
      const match = trimmed.match(arteryPattern);

      if (match) {
        const rawArtery = match[1].trim();
        const rawVal = match[2].trim();
        const details = match[3] ? match[3].trim() : '';

        // Standardize artery code
        let arteryCode = rawArtery.toUpperCase();
        if (arteryCode.includes('LEFT MAIN')) arteryCode = 'LMCA';
        else if (arteryCode.includes('DESCENDING')) arteryCode = 'LAD';
        else if (arteryCode.includes('CIRCUMFLEX')) arteryCode = 'LCX';
        else if (arteryCode.includes('RIGHT CORONARY')) arteryCode = 'RCA';

        // Check if percentage
        const pctMatch = (rawVal + ' ' + details).match(/([<>]?\s*\d{1,3}(?:\s*-\s*\d{1,3})?)\s*%/);
        const stenosisPct = pctMatch ? `${pctMatch[1].trim()}%` : (rawVal.toLowerCase().includes('normal') ? '0% (Normal)' : rawVal);

        let severity = 'Mild / Non-obstructive';
        const numVal = parseFloat(pctMatch ? pctMatch[1] : '0');
        if (numVal >= 70) severity = 'Severe / Hemodynamically Significant';
        else if (numVal >= 50) severity = 'Moderate';
        else if (numVal === 100) severity = 'Total Occlusion';
        else if (stenosisPct.includes('Normal')) severity = 'Normal / Patent';

        const findingObj = {
          artery: arteryCode,
          stenosis_percentage: stenosisPct,
          segment: details || 'Segment documented in report',
          severity,
          source_page: currentPage,
          confidence: 0.94
        };

        if (!data.stenosis_findings.some(s => s.artery === arteryCode)) {
          data.stenosis_findings.push(findingObj);
        }
        if (!data.arteries.includes(arteryCode)) {
          data.arteries.push(arteryCode);
        }
      }

      // Uncertain handwriting identification
      if (trimmed.toLowerCase().includes('unclear') || trimmed.toLowerCase().includes('illegible') || trimmed.includes('?')) {
        data.uncertain_fields.push({
          finding: trimmed,
          value: 'unclear / requires verification',
          source_page: currentPage,
          confidence: 0.40,
          description: 'Handwritten notation is partially illegible; patient must verify original document.'
        });
      }

      // Recommendations (Page 2)
      if (
        /^(recommendation|plan|impression|advised|suggested)[:\s]+/i.test(trimmed) ||
        trimmed.includes('PCI') || trimmed.includes('CABG') || trimmed.includes('Medical Therapy') || trimmed.includes('Stenting')
      ) {
        if (trimmed.length > 5 && !data.recommendations.includes(trimmed)) {
          data.recommendations.push(trimmed);
        }
      }

      // Comments
      if (/^(comment|notes|physician notes|clinical summary)[:\s]+/i.test(trimmed)) {
        data.comments.push(trimmed);
      }
    }

    // Merge Vision findings (from visionService)
    if (Array.isArray(visionFindings)) {
      visionFindings.forEach(vf => {
        if (vf.stenosis_findings && vf.stenosis_findings.length > 0) {
          vf.stenosis_findings.forEach(vs => {
            if (!data.stenosis_findings.some(s => s.artery === vs.artery)) {
              data.stenosis_findings.push(vs);
              if (!data.arteries.includes(vs.artery)) data.arteries.push(vs.artery);
            }
          });
        }
        if (vf.uncertain_fields && vf.uncertain_fields.length > 0) {
          vf.uncertain_fields.forEach(uf => {
            if (!data.uncertain_fields.some(u => u.raw_text === uf.raw_text)) {
              data.uncertain_fields.push(uf);
            }
          });
        }
        if (vf.recommendations && vf.recommendations.length > 0) {
          vf.recommendations.forEach(rec => {
            if (!data.recommendations.includes(rec)) data.recommendations.push(rec);
          });
        }
      });
    }

    // Ensure source pages default to at least [1]
    if (data.source_pages.length === 0) data.source_pages.push(1);

    return data;
  }

  /**
   * Universal parameter extraction (Laboratory + Cardiology Angiograms)
   */
  extractParameters(rawText, visionFindings = []) {
    if (!rawText || typeof rawText !== 'string') return [];

    const reportType = this.detectReportType(rawText);

    // If Coronary Angiogram, extract structured vascular parameters
    if (reportType.includes('Angiogram') || reportType.includes('Catheterization')) {
      const angioData = this.extractAngiogramData(rawText, visionFindings);
      const params = [];

      angioData.stenosis_findings.forEach(sf => {
        params.push({
          parameter: `${sf.artery} Coronary Artery`,
          result_value: sf.stenosis_percentage,
          unit: '% stenosis',
          reference_range: '< 50% (Non-obstructive)',
          status: sf.severity.includes('Severe') ? 'Critical High' : (sf.severity.includes('Moderate') ? 'High' : 'Normal'),
          flag: sf.severity.includes('Severe') ? 'SEVERE' : (sf.severity.includes('Moderate') ? 'MODERATE' : 'NORMAL'),
          source_page: sf.source_page,
          confidence: sf.confidence,
          is_vascular: true
        });
      });

      angioData.measurements.forEach(m => {
        params.push({
          parameter: m.parameter,
          result_value: m.value,
          unit: m.unit,
          reference_range: m.parameter.includes('Aortic') ? '100-140 / 60-90' : '< 12',
          status: 'Normal',
          source_page: m.source_page,
          confidence: m.confidence
        });
      });

      return params;
    }

    // Routine Laboratory extraction (CBC, Lipid, LFT, KFT, etc.)
    const lines = rawText.split(/\r?\n/);
    const extracted = [];
    const seenParameters = new Set();
    let currentPage = 1;

    for (let line of lines) {
      const trimmed = line.trim();
      const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      if (!trimmed || trimmed.length < 4) continue;

      // Skip common header/footer lines
      if (
        /^(patient|doctor|physician|technician|date|age|sex|gender|sample|specimen|interpretation|notes|acme|metro|bio-care|apex|endocrine|central|community|test name|parameter|result|---|\*\*\*|alert:|disclaimer:|clinical notes:)/i.test(trimmed)
      ) {
        continue;
      }

      // Format 1: Whitespace column separated
      const colParts = trimmed.split(/\s{2,}/).map(p => p.trim());
      if (colParts.length >= 2) {
        const paramName = colParts[0];
        const valPart = colParts[1];
        
        const numMatch = valPart.match(/^([<>]?\s*[\d\.]+)/);
        if (numMatch || isNaN(parseFloat(valPart))) {
          const unit = colParts[2] || '';
          const refRange = colParts[3] || '';
          const flag = colParts[4] || '';

          const cleanName = paramName.replace(/[:\-]/g, '').trim();
          if (cleanName.length > 1 && !seenParameters.has(cleanName.toLowerCase())) {
            seenParameters.add(cleanName.toLowerCase());
            extracted.push({
              parameter: cleanName,
              result_value: isNaN(parseFloat(valPart)) ? valPart : parseFloat(valPart),
              unit: unit.replace(/[\[\]]/g, '').trim(),
              reference_range: refRange.replace(/[\[\]]/g, '').trim(),
              flag: flag.toUpperCase().trim() || null,
              source_page: currentPage,
              confidence: 0.95
            });
            continue;
          }
        }
      }

      // Format 2: Colon separated
      const colonMatch = trimmed.match(/^([^:]+):\s*([<>]?\s*[\d\.]+|[A-Za-z]+)\s*([a-zA-Z\/\%\^0-9]+)?(?:\s*\(?(?:ref|range)?[:\s]*([^,\)\n]+)\)?)?(?:\s*\[?(HIGH|LOW|CRITICAL|ABNORMAL|NORMAL)\]?)?/i);
      if (colonMatch) {
        const paramName = colonMatch[1].trim();
        const rawVal = colonMatch[2].trim();
        const unit = colonMatch[3] ? colonMatch[3].trim() : '';
        const refRange = colonMatch[4] ? colonMatch[4].trim() : '';
        const flag = colonMatch[5] ? colonMatch[5].toUpperCase().trim() : null;

        if (paramName.length > 1 && !seenParameters.has(paramName.toLowerCase())) {
          seenParameters.add(paramName.toLowerCase());
          extracted.push({
            parameter: paramName,
            result_value: isNaN(parseFloat(rawVal)) ? rawVal : parseFloat(rawVal),
            unit: unit.replace(/[\[\]]/g, '').trim(),
            reference_range: refRange.replace(/[\[\]]/g, '').trim(),
            flag: flag,
            source_page: currentPage,
            confidence: 0.92
          });
        }
      }
    }

    return extracted;
  }
}

module.exports = new ExtractionService();
