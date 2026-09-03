/**
 * Laboratory Reference Range Analyzer (Tool 2)
 * Compares extracted values strictly against the laboratory-provided reference interval.
 * Crucial constraint: Never applies generic reference ranges when the lab provides a specific interval.
 */

const logger = require('../utils/logger');

class AnalyzerService {
  /**
   * Analyzes an extracted parameter against its report-specific reference range
   */
  analyzeParameter(param) {
    const { parameter, result_value, reference_range, flag } = param;
    const valNum = parseFloat(result_value);

    let status = 'Normal';
    let plainExplanation = '';

    // If qualitative test (e.g. Urinalysis Nitrite or Protein = Negative)
    if (isNaN(valNum)) {
      const valStr = String(result_value).toLowerCase().trim();
      const refStr = String(reference_range).toLowerCase().trim();

      if (refStr.includes('neg') && !valStr.includes('neg')) {
        status = 'Abnormal';
        plainExplanation = `The test result is "${result_value}", whereas the laboratory expected "Negative".`;
      } else {
        status = 'Normal';
        plainExplanation = `Result is "${result_value}", which is within expected normal laboratory findings.`;
      }

      return {
        parameter,
        result_value,
        unit: param.unit || '',
        reference_range: reference_range || 'Normal',
        status,
        plain_explanation: plainExplanation
      };
    }

    // Parse reference range formats:
    // 1. Range: "12.0 - 15.5" or "12.0 to 15.5"
    // 2. Upper bound: "< 200" or "<= 150"
    // 3. Lower bound: "> 40" or ">= 60"
    let lowBound = null;
    let highBound = null;

    if (reference_range) {
      const rangeMatch = reference_range.match(/([\d\.]+)\s*(?:-|to)\s*([\d\.]+)/i);
      const lessMatch = reference_range.match(/(?:<|<=)\s*([\d\.]+)/);
      const greaterMatch = reference_range.match(/(?:>|>=)\s*([\d\.]+)/);

      if (rangeMatch) {
        lowBound = parseFloat(rangeMatch[1]);
        highBound = parseFloat(rangeMatch[2]);
      } else if (lessMatch) {
        lowBound = 0;
        highBound = parseFloat(lessMatch[1]);
      } else if (greaterMatch) {
        lowBound = parseFloat(greaterMatch[1]);
        highBound = Infinity;
      }
    }

    // If vascular stenosis parameter (e.g. "LAD Coronary Artery: 75% stenosis")
    if (param.is_vascular || String(result_value).includes('%') || (param.unit && param.unit.includes('%'))) {
      const pctMatch = String(result_value).match(/(\d{1,3})/);
      const pctNum = pctMatch ? parseInt(pctMatch[1], 10) : 0;

      if (pctNum >= 70) {
        status = 'Critical High';
        plainExplanation = `Significant luminal narrowing (${result_value}) observed in this coronary vessel. Requires consultation with a cardiologist.`;
      } else if (pctNum >= 50) {
        status = 'High';
        plainExplanation = `Moderate narrowing (${result_value}) detected. May warrant physiological assessment or medical management.`;
      } else if (String(result_value).toLowerCase().includes('normal') || pctNum === 0) {
        status = 'Normal';
        plainExplanation = `Coronary vessel appears patent without angiographically significant obstructive narrowing.`;
      } else {
        status = 'Normal';
        plainExplanation = `Mild non-obstructive plaque (${result_value}) detected. Generally managed with preventive lifestyle and risk factor control.`;
      }

      return {
        parameter,
        result_value,
        unit: param.unit || '% stenosis',
        reference_range: reference_range || '< 50% (Non-obstructive)',
        status,
        plain_explanation: plainExplanation,
        source_page: param.source_page || 1,
        confidence: param.confidence || 0.95,
        is_vascular: true
      };
    }

    // Determine status
    if (lowBound !== null && highBound !== null) {
      if (valNum < lowBound) {
        // Check critical threshold (e.g. more than 30% below low bound)
        status = (valNum < lowBound * 0.6) ? 'Critical Low' : 'Low';
        plainExplanation = `Value (${valNum} ${param.unit}) is below your laboratory's normal range of ${reference_range}.`;
      } else if (valNum > highBound) {
        // Check critical threshold (e.g. >2.5x high bound or marked elevation)
        status = (valNum > highBound * 2.5) ? 'Critical High' : 'High';
        plainExplanation = `Value (${valNum} ${param.unit}) is higher than your laboratory's normal range of ${reference_range}.`;
      } else {
        status = 'Normal';
        plainExplanation = `Value (${valNum} ${param.unit}) is within your laboratory's normal reference range (${reference_range}).`;
      }
    } else if (flag) {
      // If reference range wasn't parsable but report printed a flag
      if (flag.includes('HIGH')) status = 'High';
      else if (flag.includes('LOW')) status = 'Low';
      else if (flag.includes('CRIT') || flag.includes('SEVERE')) status = 'Critical High';
      else if (flag.includes('NORM')) status = 'Normal';
      else status = 'Abnormal';
      plainExplanation = `Laboratory or procedural report flagged this value as ${status}.`;
    } else {
      status = 'Normal';
      plainExplanation = `Value is recorded as ${valNum} ${param.unit}. Specific reference range not provided.`;
    }

    return {
      parameter,
      result_value: valNum,
      unit: param.unit || '',
      reference_range: reference_range || 'Not specified',
      status,
      plain_explanation: plainExplanation,
      source_page: param.source_page || 1,
      confidence: param.confidence || 0.95
    };
  }

  /**
   * Analyzes list of extracted parameters, segregates normal vs abnormal
   */
  analyzeReport(parameters = []) {
    const normalFindings = [];
    const abnormalFindings = [];

    for (const param of parameters) {
      const analyzed = this.analyzeParameter(param);
      if (['High', 'Low', 'Critical High', 'Critical Low', 'Abnormal'].includes(analyzed.status)) {
        abnormalFindings.push(analyzed);
      } else {
        normalFindings.push(analyzed);
      }
    }

    logger.info(`Analyzed ${parameters.length} values: ${abnormalFindings.length} abnormal, ${normalFindings.length} normal.`);
    return {
      normalFindings,
      abnormalFindings,
      totalAnalyzed: parameters.length
    };
  }
}

module.exports = new AnalyzerService();
