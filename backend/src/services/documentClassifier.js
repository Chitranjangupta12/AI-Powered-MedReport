/**
 * Medical Document Classifier & Category Identifier
 * 
 * Supports:
 * - LABORATORY: CBC, LFT, KFT/Renal, Lipid, Thyroid, Glucose, Urinalysis, Hormones, Vitamins, Electrolytes
 * - RADIOLOGY: X-Ray, CT, MRI, Ultrasound, Mammogram, PET-CT
 * - CARDIOLOGY_ECG: Electrocardiogram (ECG / EKG), Holter monitor
 * - CARDIOLOGY_ECHO: Echocardiography (Transthoracic / Transesophageal)
 * - CARDIOLOGY_ANGIOGRAM: Coronary Angiography, Cardiac Catheterization
 * - PATHOLOGY: Biopsy, Histopathology, Cytology, Surgical Specimen
 * - DISCHARGE_SUMMARY: Inpatient Hospital Discharge Summary, Discharge Instructions
 * - PRESCRIPTION_MEDICATION: Prescriptions, Medication Charts
 * - CLINICAL_NOTE: Doctor Consultation Note, Progress Note, Referral Letter
 * - UNKNOWN: Fallback for ambiguous or unsupported document types (never forces wrong category)
 */

class DocumentClassifier {
  classify(text = '', metadata = {}) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        category: 'UNKNOWN',
        confidence: 0.0,
        sub_type: 'Empty or Unreadable Document',
        matched_indicators: []
      };
    }

    const lower = text.toLowerCase();
    const matchedIndicators = [];

    // 1. CARDIOLOGY - CORONARY ANGIOGRAM / CARDIAC CATH
    if (
      (lower.includes('coronary angiogram') || lower.includes('coronary angiography') || lower.includes('cardiac catheterization') || lower.includes('catheterization laboratory')) ||
      (lower.includes('lmca') && lower.includes('stenosis')) ||
      (lower.includes('lad') && lower.includes('stenosis') && lower.includes('rca'))
    ) {
      matchedIndicators.push('coronary catheterization / angiography vascular markings');
      return {
        category: 'CARDIOLOGY_ANGIOGRAM',
        confidence: 0.96,
        sub_type: 'Coronary Angiogram / Cardiac Catheterization',
        matched_indicators: matchedIndicators
      };
    }

    // 2. CARDIOLOGY - ECG / EKG
    if (
      (lower.includes('electrocardiogram') || lower.includes('ecg') || lower.includes('ekg') || lower.includes('12-lead')) &&
      (lower.includes('rhythm') || lower.includes('pr interval') || lower.includes('qrs') || lower.includes('qtc') || lower.includes('sinus'))
    ) {
      matchedIndicators.push('ecg intervals / rhythm / axis');
      return {
        category: 'CARDIOLOGY_ECG',
        confidence: 0.95,
        sub_type: 'Electrocardiogram (ECG / EKG)',
        matched_indicators: matchedIndicators
      };
    }

    // 3. CARDIOLOGY - ECHOCARDIOGRAM
    if (
      (lower.includes('echocardiogram') || lower.includes('echocardiography') || lower.includes('2d echo') || lower.includes('transthoracic echo')) &&
      (lower.includes('ejection fraction') || lower.includes('valve') || lower.includes('atrium') || lower.includes('ventricle'))
    ) {
      matchedIndicators.push('echocardiography chamber / valve dynamics');
      return {
        category: 'CARDIOLOGY_ECHO',
        confidence: 0.94,
        sub_type: 'Echocardiography Report',
        matched_indicators: matchedIndicators
      };
    }

    // 4. RADIOLOGY (X-Ray, CT, MRI, Ultrasound)
    const isRadiologyKeyword = 
      lower.includes('x-ray') || lower.includes('xray') || lower.includes('radiograph') ||
      lower.includes('computed tomography') || lower.includes('ct scan') || lower.includes('ct ') ||
      lower.includes('magnetic resonance') || lower.includes('mri') ||
      lower.includes('ultrasound') || lower.includes('ultrasonography') || lower.includes('sonography') || lower.includes('usg') ||
      lower.includes('mammography') || lower.includes('pet-ct');

    const hasRadiologySections = 
      lower.includes('impression:') || lower.includes('findings:') || lower.includes('technique:') ||
      lower.includes('clinical indication:') || lower.includes('examination:') || lower.includes('comparison:');

    if (isRadiologyKeyword && (hasRadiologySections || lower.includes('radiologist') || lower.includes('imaging'))) {
      let subType = 'General Diagnostic Radiology Report';
      if (lower.includes('chest x-ray') || lower.includes('cxr') || (lower.includes('x-ray') && lower.includes('chest'))) subType = 'Chest X-Ray';
      else if (lower.includes('ct')) subType = 'Computed Tomography (CT Scan)';
      else if (lower.includes('mri')) subType = 'Magnetic Resonance Imaging (MRI)';
      else if (lower.includes('ultrasound') || lower.includes('usg') || lower.includes('sonography')) subType = 'Ultrasound (Sonogram)';

      matchedIndicators.push('radiology imaging study and radiological impression');
      return {
        category: 'RADIOLOGY',
        confidence: 0.93,
        sub_type: subType,
        matched_indicators: matchedIndicators
      };
    }

    // 5. PATHOLOGY & HISTOPATHOLOGY
    if (
      (lower.includes('histopathology') || lower.includes('pathology report') || lower.includes('surgical pathology') || lower.includes('biopsy') || lower.includes('cytology') || lower.includes('fine needle aspiration') || lower.includes('fna')) &&
      (lower.includes('specimen') || lower.includes('microscopic') || lower.includes('gross description') || lower.includes('histologic'))
    ) {
      matchedIndicators.push('pathology tissue specimen / microscopic analysis');
      return {
        category: 'PATHOLOGY',
        confidence: 0.94,
        sub_type: 'Surgical Pathology / Biopsy Report',
        matched_indicators: matchedIndicators
      };
    }

    // 6. DISCHARGE SUMMARY
    if (
      (lower.includes('discharge summary') || lower.includes('discharge report') || lower.includes('inpatient summary')) ||
      (lower.includes('admission date') && lower.includes('discharge date') && (lower.includes('hospital course') || lower.includes('discharge medications')))
    ) {
      matchedIndicators.push('hospital admission/discharge course');
      return {
        category: 'DISCHARGE_SUMMARY',
        confidence: 0.95,
        sub_type: 'Hospital Inpatient Discharge Summary',
        matched_indicators: matchedIndicators
      };
    }

    // 7. PRESCRIPTION & MEDICATION DOCUMENT
    if (
      (lower.includes('rx') || lower.includes('prescription') || lower.includes('medication chart') || lower.includes('medication list')) &&
      (lower.includes('dosage') || lower.includes('mg') || lower.includes('daily') || lower.includes('oral') || lower.includes('tablets') || lower.includes('capsule')) &&
      !lower.includes('discharge summary')
    ) {
      matchedIndicators.push('medication orders / prescription instructions');
      return {
        category: 'PRESCRIPTION_MEDICATION',
        confidence: 0.88,
        sub_type: 'Prescription / Medication Document',
        matched_indicators: matchedIndicators
      };
    }

    // 8. CLINICAL CONSULTATION / PROGRESS NOTE
    if (
      (lower.includes('consultation note') || lower.includes('progress note') || lower.includes('clinical note') || lower.includes('referral letter') || lower.includes('outpatient note')) &&
      (lower.includes('chief complaint') || lower.includes('history of present illness') || lower.includes('assessment and plan') || lower.includes('subjective:'))
    ) {
      matchedIndicators.push('physician clinical documentation / consultation');
      return {
        category: 'CLINICAL_NOTE',
        confidence: 0.90,
        sub_type: 'Clinical Progress Note / Referral Report',
        matched_indicators: matchedIndicators
      };
    }

    // 9. LABORATORY REPORTS (CBC, Lipid, LFT, KFT, Thyroid, Glucose, Urinalysis, Hormones, etc.)
    const labKeywords = [
      'complete blood count', 'cbc', 'hemoglobin', 'platelet', 'wbc', 'rbc',
      'lipid profile', 'cholesterol', 'triglyceride', 'hdl', 'ldl',
      'liver function', 'lft', 'alanine transaminase', 'alt', 'aspartate transaminase', 'ast', 'bilirubin', 'alkaline phosphatase',
      'kidney function', 'kft', 'renal panel', 'creatinine', 'blood urea nitrogen', 'bun', 'egfr',
      'thyroid', 'tsh', 'free t3', 'free t4',
      'glucose', 'hba1c', 'glycated hemoglobin', 'blood sugar',
      'urinalysis', 'urine routine', 'leukocyte esterase', 'urine culture',
      'electrolyte', 'sodium', 'potassium', 'chloride', 'calcium',
      'vitamin d', 'vitamin b12', 'ferritin', 'iron panel',
      'biochemistry', 'pathology laboratory', 'specimen: serum', 'specimen: whole blood'
    ];

    let labMatches = 0;
    labKeywords.forEach(kw => {
      if (lower.includes(kw)) labMatches++;
    });

    if (
      labMatches >= 2 ||
      (lower.includes('test name') && lower.includes('result')) ||
      (lower.includes('test name') && lower.includes('reference range')) ||
      (lower.includes('analyte') && lower.includes('result')) ||
      (lower.includes('lab report') && lower.includes('result'))
    ) {
      matchedIndicators.push(`clinical laboratory analyte keywords (${labMatches} matches)`);
      
      let subType = 'General Clinical Laboratory Report';
      if (lower.includes('cbc') || lower.includes('complete blood count') || (lower.includes('hemoglobin') && lower.includes('platelet'))) {
        subType = 'Complete Blood Count (CBC)';
      } else if (lower.includes('lipid') || lower.includes('cholesterol') || lower.includes('triglyceride')) {
        subType = 'Lipid Profile';
      } else if (lower.includes('liver') || lower.includes('lft') || (lower.includes('alt') && lower.includes('ast'))) {
        subType = 'Liver Function Test (LFT)';
      } else if (lower.includes('kidney') || lower.includes('renal') || lower.includes('creatinine')) {
        subType = 'Kidney Function Test (KFT / Renal Panel)';
      } else if (lower.includes('thyroid') || lower.includes('tsh')) {
        subType = 'Thyroid Function Panel';
      } else if (lower.includes('glucose') || lower.includes('hba1c')) {
        subType = 'Glycemic Profile / Blood Glucose';
      } else if (lower.includes('urinalysis') || lower.includes('urine routine')) {
        subType = 'Urinalysis Routine Examination';
      }

      return {
        category: 'LABORATORY',
        confidence: 0.95,
        sub_type: subType,
        matched_indicators: matchedIndicators
      };
    }

    // 10. UNKNOWN / UNCERTAIN
    return {
      category: 'UNKNOWN',
      confidence: 0.35,
      sub_type: 'Unclassified Medical Document',
      matched_indicators: ['ambiguous or unstructured medical document format']
    };
  }
}

module.exports = new DocumentClassifier();
