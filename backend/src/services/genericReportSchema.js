/**
 * Universal Medical Report Data Schema & Builder
 * 
 * Provides a normalized internal medical report object that adapts to any medical document type:
 * - Laboratory (analytes, reference ranges, flags, units, remarks)
 * - Radiology (examination, body region, technique, findings, impression, recommendations)
 * - Cardiology ECG (rate, rhythm, intervals, axis, interpretation)
 * - Cardiology Angiogram (arteries, segments, stenosis percentages, recommendations)
 * - Pathology (specimen, gross, microscopic, diagnostic conclusions)
 * - Discharge Summary (diagnoses as documented, procedures, hospital course, discharge meds)
 * - Clinical Notes & Unknowns (sections, observations, uncertain fields)
 */

class GenericReportSchema {
  static createDefault(documentType = 'UNKNOWN', reportTitle = 'Medical Document') {
    return {
      document_type: documentType,
      report_title: reportTitle,
      patient_information: {
        name: null,
        age: null,
        gender: null,
        mrn: null
      },
      report_date: null,
      facility_information: {
        name: null,
        department: null
      },
      sections: [],
      observations: [],
      measurements: [],
      reference_ranges: [],
      qualitative_findings: [],
      impressions: [],
      conclusions: [],
      recommendations: [],
      remarks: [],
      medications: [],
      procedures: [],
      diagnoses_as_written: [],
      images_or_diagrams: [],
      handwritten_content: [],
      uncertain_fields: [],
      source_pages: [1],
      confidence: 0.9,
      extraction_status: 'SUCCESS'
    };
  }
}

module.exports = GenericReportSchema;
