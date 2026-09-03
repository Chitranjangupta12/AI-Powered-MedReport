/**
 * Synthetic Sample Medical Report PDF Generator
 * 
 * Generates:
 * 1. Routine Single-Page Lab PDFs (CBC Anemia, Lipid Profile, Liver Acute)
 * 2. Real-World Multi-Page Scanned-Style Coronary Angiogram PDF
 *    - Page 1: Clinical background, Hemodynamics, Coronary Anatomy Diagram, Table with handwritten stenosis percentages (LAD 75%, RCA 90%, LCx 30%)
 *    - Page 2: Left ventriculography, handwritten comments, uncertain handwritten notation, and clinical recommendations
 */

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const SAMPLES_DIR = path.join(__dirname, '../../sample_reports');

if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

function createPdfReport(filename, data) {
  const filePath = path.join(SAMPLES_DIR, filename);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fillColor('#dc2626').fontSize(10).text('*** SYNTHETIC DEMO REPORT - FOR TESTING ONLY - NOT REAL PATIENT DATA ***', { align: 'center' });
  doc.moveDown(0.5);

  doc.fillColor('#0f766e').fontSize(18).text(data.labName, { align: 'center' });
  doc.fillColor('#64748b').fontSize(9).text('Accredited Clinical Pathology & Diagnostic Services | Synthetic Laboratory ID: LAB-9942', { align: 'center' });
  doc.moveDown(1);

  // Divider
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.8);

  // Patient Info Box
  doc.fillColor('#0f172a').fontSize(10);
  doc.text(`Patient Name: ${data.patientName}       Age: ${data.age}       Sex: ${data.sex}`);
  doc.text(`Ordering Physician: Dr. Synthetic MD         Collection Date: ${data.date}       Specimen: ${data.specimen}`);
  doc.moveDown(0.8);

  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // Report Title
  doc.fillColor('#1e293b').fontSize(14).text(data.reportTitle, { underline: true });
  doc.moveDown(1);

  // Table Headers
  const startY = doc.y;
  doc.fontSize(9).fillColor('#475569');
  doc.text('TEST NAME                  RESULT    UNIT       REFERENCE RANGE   FLAG', 50, startY);
  doc.moveDown(0.5);

  let currentY = doc.y + 4;
  doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(50, currentY).lineTo(550, currentY).stroke();
  currentY += 8;

  // Table Rows (Write formatted column lines)
  data.tests.forEach(test => {
    const isAbnormal = test.flag && test.flag !== 'NORMAL';
    doc.fillColor(isAbnormal ? '#b91c1c' : '#1e293b').fontSize(9);

    const padName = test.name.padEnd(26, ' ');
    const padVal = String(test.value).padEnd(10, ' ');
    const padUnit = test.unit.padEnd(11, ' ');
    const padRange = test.range.padEnd(18, ' ');
    const rowLine = `${padName}${padVal}${padUnit}${padRange}${test.flag || ''}`;

    doc.text(rowLine, 50, currentY);
    currentY += 18;
  });

  doc.y = currentY + 15;
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // Clinical Comments
  doc.fillColor('#334155').fontSize(9);
  doc.text(`Clinical Notes: ${data.notes}`);
  doc.moveDown(1);

  // Footer Disclaimer
  doc.fillColor('#94a3b8').fontSize(8).text('Disclaimer: This is a generated synthetic demo document intended solely for testing AI document parsing and natural language explanations. It contains fictional data and is not associated with any real human subject.', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Creates a realistic 2-page Coronary Angiogram PDF with diagrams, handwritten tables, and recommendations
 */
function createCoronaryAngiogramPdf(filename) {
  const filePath = path.join(SAMPLES_DIR, filename);
  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ==========================================
  // PAGE 1: Clinical Info, Hemodynamics, Table & Diagrams
  // ==========================================
  doc.fillColor('#b91c1c').fontSize(9).text('*** SYNTHETIC CARDIAC CATHETERIZATION REPORT - FOR AI TESTING ONLY ***', { align: 'center' });
  doc.moveDown(0.3);

  doc.fillColor('#1e3a8a').fontSize(16).text('METROPOLITAN HEART & VASCULAR INSTITUTE', { align: 'center' });
  doc.fillColor('#475569').fontSize(8).text('Department of Interventional Cardiology | Cardiac Catheterization Laboratory Suite 3', { align: 'center' });
  doc.moveDown(0.6);

  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
  doc.moveDown(0.5);

  // Patient & Procedural Data Box
  doc.fillColor('#0f172a').fontSize(9);
  doc.text('Patient Name: Robert Synthetic Vance       Age: 61       Sex: Male       MRN: #CATH-88421');
  doc.text('Procedure: Coronary Angiography (Left Heart Catheterization)      Date: 03/03/2026');
  doc.text('Indication: Exertional Angina & Positive Exercise Stress Test     Approach: Right Radial Artery (6 French sheath)');
  doc.moveDown(0.5);

  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
  doc.moveDown(0.6);

  // Section: Hemodynamics
  doc.fillColor('#1e293b').fontSize(11).text('Hemodynamic Measurements:');
  doc.fillColor('#334155').fontSize(9);
  doc.text('Aortic Pressure: 135/82 mmHg       LVEDP: 14 mmHg       Resting Heart Rate: 72 bpm');
  doc.moveDown(0.6);

  // Section: Visual Coronary Artery Diagram Representation
  doc.fillColor('#1e293b').fontSize(11).text('Coronary Artery Anatomy Diagram & Branching Scheme:');
  doc.moveDown(0.3);

  // Draw visual schematic representation of coronary branches
  const diagX = 50;
  const diagY = doc.y;
  doc.strokeColor('#0284c7').lineWidth(2);
  // Aorta / Ostium
  doc.circle(diagX + 40, diagY + 20, 15).stroke();
  // LMCA stem
  doc.moveTo(diagX + 55, diagY + 20).lineTo(diagX + 110, diagY + 20).stroke();
  // LAD branch
  doc.moveTo(diagX + 110, diagY + 20).lineTo(diagX + 180, diagY + 65).stroke();
  // LCx branch
  doc.moveTo(diagX + 110, diagY + 20).lineTo(diagX + 180, diagY - 15).stroke();
  // RCA branch
  doc.moveTo(diagX + 40, diagY + 35).lineTo(diagX + 40, diagY + 80).lineTo(diagX + 110, diagY + 95).stroke();

  // Labels for diagrams
  doc.fillColor('#0f172a').fontSize(8);
  doc.text('LMCA', diagX + 65, diagY + 8);
  doc.text('LAD (Narrowing marked)', diagX + 130, diagY + 45);
  doc.text('LCx', diagX + 140, diagY - 8);
  doc.text('RCA (Severe lesion marked)', diagX + 50, diagY + 100);

  doc.y = diagY + 115;
  doc.moveDown(0.5);

  // Table: Coronary Artery Stenosis Findings (Handwritten style annotations)
  doc.fillColor('#1e293b').fontSize(11).text('Coronary Artery Assessment & Stenosis Percentages:');
  doc.fillColor('#64748b').fontSize(8).text('[Table fields recorded during fluoroscopy with physician handwritten annotations]');
  doc.moveDown(0.4);

  const tableTop = doc.y;
  doc.fillColor('#1e293b').fontSize(8);
  doc.text('VESSEL / ARTERY                  SEGMENT                  STENOSIS (%)           CONFIDENCE / STATUS', 45, tableTop);
  doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(40, tableTop + 12).lineTo(570, tableTop + 12).stroke();

  let rowY = tableTop + 18;
  const angiogramRows = [
    { artery: 'LMCA', segment: 'Main Stem / Ostium', stenosis: '0% (Normal)', status: 'Patent / Normal flow', color: '#166534' },
    { artery: 'LAD', segment: 'Mid-vessel segment', stenosis: '75% stenosis', status: 'Severe narrowing / flow restriction', color: '#dc2626' },
    { artery: 'LCx', segment: 'Proximal segment', stenosis: '30% stenosis', status: 'Mild non-obstructive plaque', color: '#047857' },
    { artery: 'RCA', segment: 'Proximal-to-mid segment', stenosis: '90% stenosis', status: 'Critical severe stenosis / slow flow', color: '#b91c1c' },
    { artery: 'PDA', segment: 'Distal branch', stenosis: 'Normal', status: 'Patent vessel', color: '#166534' }
  ];

  angiogramRows.forEach(row => {
    doc.fillColor('#0f172a').fontSize(8).text(row.artery.padEnd(20, ' '), 45, rowY);
    doc.text(row.segment.padEnd(25, ' '), 150, rowY);
    doc.fillColor(row.color).font('Helvetica-Bold').text(row.stenosis.padEnd(18, ' '), 285, rowY);
    doc.font('Helvetica').fillColor('#334155').text(row.status, 400, rowY);
    rowY += 16;
  });

  doc.y = rowY + 10;
  doc.fillColor('#475569').fontSize(8).text('Page 1 of 2  |  Operator Notes: Fluoroscopy time: 8.2 mins  |  Contrast Volume: 75 mL Omnipaque', { align: 'center' });

  // ==========================================
  // PAGE 2: Ventriculography, Notes & Recommendations
  // ==========================================
  doc.addPage();

  doc.fillColor('#b91c1c').fontSize(9).text('*** SYNTHETIC CARDIAC CATHETERIZATION REPORT - PAGE 2 ***', { align: 'center' });
  doc.moveDown(0.5);

  doc.fillColor('#1e3a8a').fontSize(14).text('METROPOLITAN HEART & VASCULAR INSTITUTE', { align: 'center' });
  doc.fillColor('#475569').fontSize(8).text('Patient: Robert Synthetic Vance | MRN: #CATH-88421 | Procedure Date: 03/03/2026', { align: 'center' });
  doc.moveDown(0.6);

  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(570, doc.y).stroke();
  doc.moveDown(0.6);

  // Left Ventriculography
  doc.fillColor('#1e293b').fontSize(11).text('Left Ventriculography & Functional Assessment:');
  doc.fillColor('#334155').fontSize(9);
  doc.text('• Ejection Fraction (LVEF): 55% (Estimated preserved systolic function).');
  doc.text('• Wall Motion: Mild hypokinesia of the inferior myocardial wall; anterior wall motion normal.');
  doc.text('• Valvular Function: No significant mitral regurgitation visualized.');
  doc.moveDown(0.8);

  // Handwritten Comments & Operator Notes Section
  doc.fillColor('#1e293b').fontSize(11).text('Operator Summary & Handwritten Clinical Notes:');
  doc.fillColor('#334155').fontSize(9);
  doc.text('1. Two-vessel coronary artery disease with significant hemodynamically important narrowing in the RCA (90%) and mid-LAD (75%).');
  doc.text('2. Left Main Coronary Artery is free of angiographically significant disease.');
  doc.moveDown(0.5);

  // Handwritten Notation with Uncertain / Faint Field
  doc.fillColor('#64748b').fontSize(8).text('[Handwritten Physician Notation]');
  doc.fillColor('#0284c7').font('Courier-Oblique').fontSize(9);
  doc.text('Physician Note: Radial puncture site clean, hemostasis achieved with TR band. Resting distal flow TIMI 2 in RCA.');
  doc.text('Annotated remark: Marginal branch anatomy is [faint ink / unclear / requires verification].');
  doc.font('Helvetica').fillColor('#334155').fontSize(9);
  doc.moveDown(0.8);

  // Recommendations & Next Steps
  doc.fillColor('#1e293b').fontSize(11).text('Recommendations & Plan:');
  doc.fillColor('#0f172a').fontSize(9);
  doc.text('• Clinical Recommendation: Heart Team consultation recommended for revascularization options (PCI with drug-eluting stent to RCA/LAD vs surgical evaluation).');
  doc.text('• Recommendation: Continue dual antiplatelet therapy (DAPT) and high-intensity statin therapy as prescribed.');
  doc.text('• Plan: Discharge after 4 hours of radial monitoring; follow up in cardiology clinic within 5-7 days.');
  doc.moveDown(1.5);

  // Physician Sign-off Box
  doc.strokeColor('#cbd5e1').lineWidth(0.5).rect(40, doc.y, 530, 45).stroke();
  const sigY = doc.y + 6;
  doc.fillColor('#1e293b').fontSize(8).text('Interventional Cardiologist: Dr. Marcus Sterling, MD, FACC   License: #MED-44910', 50, sigY);
  doc.text('Electronically signed and verified at Cardiac Cath Lab on 03/03/2026 15:45 EST', 50, sigY + 14);
  doc.text('Status: Finalized & Transcribed Document', 50, sigY + 24);

  doc.y = sigY + 45;
  doc.moveDown(1);

  // Footer Disclaimer
  doc.fillColor('#94a3b8').fontSize(7.5).text('Disclaimer: Synthetic demo document produced solely for evaluating multi-page medical document understanding, optical layout extraction, and patient-centered RAG guidance. Contains fictional clinical data.', { align: 'center' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

async function generateAllSamplePdfs() {
  console.log('Generating synthetic medical report PDFs...');

  // 1. CBC Anemia
  await createPdfReport('synthetic_cbc_anemia.pdf', {
    labName: 'ACME CLINICAL LABORATORY',
    patientName: 'Jane Synthetic Doe',
    age: '34',
    sex: 'Female',
    date: '03/01/2026',
    specimen: 'Whole Blood (EDTA)',
    reportTitle: 'COMPLETE BLOOD COUNT (CBC) WITH DIFFERENTIAL',
    notes: 'Microcytic hypochromic profile observed. Findings are suggestive of iron deficiency anemia. Clinical correlation advised.',
    tests: [
      { name: 'Hemoglobin', value: '9.4', unit: 'g/dL', range: '12.0 - 15.5', flag: 'LOW' },
      { name: 'Red Blood Cell (RBC)', value: '3.4', unit: '10^6/uL', range: '4.0 - 5.2', flag: 'LOW' },
      { name: 'Hematocrit', value: '29.0', unit: '%', range: '37.0 - 48.0', flag: 'LOW' },
      { name: 'Mean Corpuscular Vol (MCV)', value: '72.0', unit: 'fL', range: '80.0 - 100.0', flag: 'LOW' },
      { name: 'White Blood Cell (WBC)', value: '6.8', unit: '10^3/uL', range: '4.5 - 11.0', flag: 'NORMAL' },
      { name: 'Platelet Count', value: '240', unit: '10^3/uL', range: '150 - 450', flag: 'NORMAL' }
    ]
  });

  // 2. Lipid Panel
  await createPdfReport('synthetic_lipid_panel.pdf', {
    labName: 'METRO HEALTH DIAGNOSTICS',
    patientName: 'John Synthetic Smith',
    age: '52',
    sex: 'Male',
    date: '03/02/2026',
    specimen: 'Serum (Fasting 12h)',
    reportTitle: 'COMPREHENSIVE LIPID PROFILE',
    notes: 'Mixed dyslipidemia pattern. Elevated LDL and Total Cholesterol indicate increased atherosclerotic cardiovascular risk.',
    tests: [
      { name: 'Total Cholesterol', value: '265', unit: 'mg/dL', range: '< 200', flag: 'HIGH' },
      { name: 'Triglycerides', value: '220', unit: 'mg/dL', range: '< 150', flag: 'HIGH' },
      { name: 'HDL Cholesterol', value: '38', unit: 'mg/dL', range: '> 40', flag: 'LOW' },
      { name: 'LDL Cholesterol', value: '183', unit: 'mg/dL', range: '< 100', flag: 'HIGH' },
      { name: 'Cholesterol / HDL Ratio', value: '7.0', unit: 'ratio', range: '< 5.0', flag: 'HIGH' }
    ]
  });

  // 3. Liver Function Test (Critical ALT/AST)
  await createPdfReport('synthetic_liver_acute.pdf', {
    labName: 'BIO-CARE PATHOLOGY SERVICES',
    patientName: 'Alex Synthetic Taylor',
    age: '45',
    sex: 'Non-binary',
    date: '03/03/2026',
    specimen: 'Serum',
    reportTitle: 'HEPATIC FUNCTION PANEL (LFT)',
    notes: 'CRITICAL ALERT: ALT and AST markedly elevated over 7x upper reference limit. Acute hepatocellular injury suspected. Prompt medical evaluation required.',
    tests: [
      { name: 'ALT (Alanine Transaminase)', value: '412', unit: 'U/L', range: '7 - 56', flag: 'CRITICAL HIGH' },
      { name: 'AST (Aspartate Transaminase)', value: '385', unit: 'U/L', range: '10 - 40', flag: 'CRITICAL HIGH' },
      { name: 'Alkaline Phosphatase', value: '115', unit: 'U/L', range: '44 - 147', flag: 'NORMAL' },
      { name: 'Total Bilirubin', value: '2.8', unit: 'mg/dL', range: '0.2 - 1.2', flag: 'HIGH' },
      { name: 'Serum Albumin', value: '4.1', unit: 'g/dL', range: '3.5 - 5.0', flag: 'NORMAL' }
    ]
  });

  // 4. Real-World 2-Page Coronary Angiogram (Scanned & Handwritten style)
  await createCoronaryAngiogramPdf('synthetic_coronary_angiogram.pdf');

  console.log(`Generated synthetic sample PDFs in ${SAMPLES_DIR}`);
}

if (require.main === module) {
  generateAllSamplePdfs().catch(console.error);
}

module.exports = { generateAllSamplePdfs, createPdfReport, createCoronaryAngiogramPdf };
