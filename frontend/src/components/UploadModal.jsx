import React, { useState, useRef } from 'react';
import {
  Upload, X, FileCheck, AlertCircle, Sparkles, Loader2,
  CheckCircle2, Clock, FileText, Layers, Eye
} from 'lucide-react';
import { api } from '../services/api';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file) => {
    setErrorMessage('');
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Unsupported file format. Please upload a PDF, JPG, or PNG report.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File exceeds the 20 MB limit. Please choose a smaller report.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(15);
    setProcessingStep(1);
    setErrorMessage('');

    // Progressive visual pipeline timer
    const timer1 = setTimeout(() => { setProcessingStep(2); setUploadProgress(35); }, 400);
    const timer2 = setTimeout(() => { setProcessingStep(3); setUploadProgress(60); }, 900);
    const timer3 = setTimeout(() => { setProcessingStep(4); setUploadProgress(85); }, 1400);

    try {
      const data = await api.uploadReport(selectedFile, (progress) => {
        setUploadProgress(Math.max(progress, 20));
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setProcessingStep(5);
      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(data);
        onClose();
      }, 500);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsUploading(false);
      const msg = err.response?.data?.message || err.message || 'Failed to upload and analyze report.';
      setErrorMessage(msg);
    }
  };

  // Quick Synthetic Demo Reports (for testing & demonstration)
  const handleQuickSynthetic = (type) => {
    let filename = '';
    let content = '';

    if (type === 'cbc') {
      filename = 'synthetic_cbc_anemia.txt';
      content = `ACME CLINICAL LABORATORY
*** SYNTHETIC DEMO REPORT - FOR TESTING PURPOSES ONLY ***
Patient: Jane Synthetic Doe | Age: 34 | Sex: F | Date: 03/01/2026
TEST NAME                  RESULT    UNIT       REFERENCE RANGE   FLAG
-----------------------------------------------------------------------
Hemoglobin                 9.4       g/dL       12.0 - 15.5       LOW
Red Blood Cell (RBC) Count 3.4       10^6/uL    4.0 - 5.2         LOW
White Blood Cell (WBC)     6.8       10^3/uL    4.5 - 11.0        NORMAL
Platelet Count             240       10^3/uL    150 - 450         NORMAL
Mean Corpuscular Vol (MCV) 72.0      fL         80.0 - 100.0      LOW
Hematocrit                 29.0      %          37.0 - 48.0       LOW
-----------------------------------------------------------------------
Clinical Notes: Microcytic hypochromic profile, suggestive of iron deficiency anemia.`;
    } else if (type === 'lipid') {
      filename = 'synthetic_lipid_panel.txt';
      content = `METRO HEALTH CLINICAL LABS
*** SYNTHETIC DEMO REPORT - FOR TESTING PURPOSES ONLY ***
Patient: John Synthetic Smith | Age: 52 | Sex: M | Date: 03/02/2026
TEST NAME                  RESULT    UNIT       REFERENCE RANGE   FLAG
-----------------------------------------------------------------------
Total Cholesterol          265       mg/dL      < 200             HIGH
Triglycerides              220       mg/dL      < 150             HIGH
HDL Cholesterol (Good)     38        mg/dL      > 40              LOW
LDL Cholesterol (Calc)     183       mg/dL      < 100             HIGH
Cholesterol / HDL Ratio    7.0       ratio      < 5.0             HIGH
-----------------------------------------------------------------------
Clinical Notes: Mixed dyslipidemia pattern. Elevated LDL and Total Cholesterol.`;
    } else if (type === 'angio') {
      filename = 'synthetic_coronary_angiogram.txt';
      content = `CARDIOLOGY CATHETERIZATION LABORATORY
CORONARY ANGIOGRAM REPORT
Patient: Robert Taylor | Age: 61 | Sex: M | Procedure: Coronary Angiogram
Vessel / Artery      Segment                 Stenosis (%)      Status
LMCA                 Main Stem               0%                Normal
LAD                  Mid-vessel              75%               Severe
LCx                  Proximal                30%               Mild
RCA                  Proximal-to-mid         90%               Severe
PDA                  Distal                  Normal            Patent
Impression: Two-vessel coronary artery disease with hemodynamically significant stenosis in RCA (90%) and LAD (75%).`;
    } else if (type === 'cxr') {
      filename = 'synthetic_chest_xray.txt';
      content = `DEPARTMENT OF RADIOLOGY & IMAGING
REPORT OF CHEST X-RAY PA VIEW
Patient: David Miller | Age: 48 | Sex: M | Study Date: 03/03/2026
Technique: Standard PA erect view.
Findings:
- Lungs: Focal consolidation identified in the right lower lobe with prominent air bronchograms.
- Costophrenic Angles: Clear and sharp.
- Cardiac Silhouette: Normal in size and configuration.
- Mediastinum & Hila: Unremarkable.
- Thoracic Skeleton: Intact.
IMPRESSION: Findings compatible with right lower lobe pneumonia. Correlation with clinical symptoms and follow-up recommended.`;
    } else if (type === 'ecg') {
      filename = 'synthetic_12lead_ecg.txt';
      content = `CLINICAL CARDIOLOGY DIAGNOSTIC SERVICES
12-LEAD ELECTROCARDIOGRAM REPORT
Patient: Eleanor Vance | Age: 67 | Sex: F
Measurements:
- Heart Rate: 78 bpm
- PR Interval: 162 ms
- QRS Duration: 94 ms
- QTc Interval: 428 ms
- P-R-T Axis: 45 / 38 / 42 degrees
Rhythm Analysis: Normal sinus rhythm with normal axis.
IMPRESSION: Normal 12-lead ECG. No acute ST-T wave abnormalities or ischemic changes identified.`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    setSelectedFile(file);
  };

  const processingSteps = [
    { num: 1, label: 'File uploaded & document type detected' },
    { num: 2, label: 'OCR & visual layout extraction completed' },
    { num: 3, label: 'Structuring findings & validating reference intervals' },
    { num: 4, label: 'Retrieving grounded medical evidence (RAG)' },
    { num: 5, label: 'Synthesizing plain-language patient guidance' }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(4, 8, 15, 0.85)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100, padding: '1rem'
    }} onClick={onClose}>
      <div
        className="dark-card"
        style={{ maxWidth: '640px', width: '100%', border: '1px solid rgba(6, 182, 212, 0.25)', boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dark-card-header">
          <div className="dark-card-title">
            <Upload size={20} color="var(--primary)" />
            <span>Upload Medical Report</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-dim)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Upload your medical document (PDF, PNG, or JPG). Supported modalities include Laboratory panels, Radiology scans, ECG tracings, Angiograms, and Discharge summaries.
        </p>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
            fontSize: '0.84rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}

        {/* Drag & Drop Area */}
        {!isUploading ? (
          <div>
            <div
              className={`dark-dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={{
                width: 54, height: 54, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)',
                color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <Upload size={26} />
              </div>

              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.35rem' }}>
                {selectedFile ? selectedFile.name : 'Upload your medical report'}
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB • Click or drop another to replace`
                  : 'PDF, JPG, PNG supported • Drag & drop or browse'}
              </p>
            </div>

            {/* Quick Demo Synthetic Reports */}
            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                <Sparkles size={14} color="var(--primary)" />
                Or Try a Synthetic Demo Report (Instant):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                <button
                  onClick={() => handleQuickSynthetic('cbc')}
                  style={{
                    background: 'var(--bg-card-elevated)', border: '1px solid var(--border-subtle)',
                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
                    color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer'
                  }}
                >
                  CBC - Moderate Anemia
                </button>
                <button
                  onClick={() => handleQuickSynthetic('lipid')}
                  style={{
                    background: 'var(--bg-card-elevated)', border: '1px solid var(--border-subtle)',
                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
                    color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer'
                  }}
                >
                  Lipid Panel - Elevated LDL
                </button>
                <button
                  onClick={() => handleQuickSynthetic('angio')}
                  style={{
                    background: 'var(--bg-card-elevated)', border: '1px solid var(--border-subtle)',
                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
                    color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer'
                  }}
                >
                  Coronary Angiogram - 90% RCA
                </button>
                <button
                  onClick={() => handleQuickSynthetic('cxr')}
                  style={{
                    background: 'var(--bg-card-elevated)', border: '1px solid var(--border-subtle)',
                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem',
                    color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer'
                  }}
                >
                  Chest X-Ray - PA View
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Multi-Step Real Processing Screen */
          <div style={{ padding: '1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                DOCUMENT PROCESSING PIPELINE
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                {uploadProgress}%
              </span>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--bg-card-elevated)', borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #06b6d4, #3b82f6)', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {processingSteps.map((s) => {
                const isDone = processingStep > s.num;
                const isCurrent = processingStep === s.num;

                return (
                  <div
                    key={s.num}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      fontSize: '0.84rem',
                      color: isDone ? '#34d399' : (isCurrent ? 'var(--text-bright)' : 'var(--text-dim)')
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} color="#34d399" />
                    ) : (
                      isCurrent ? (
                        <Loader2 size={16} className="animate-spin" color="var(--primary)" />
                      ) : (
                        <Clock size={16} color="var(--text-dim)" />
                      )
                    )}
                    <span style={{ fontWeight: isCurrent ? 700 : 400 }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="top-btn-pill"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="btn-upload-prominent"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Analyzing Report...</span>
              </>
            ) : (
              <span>Analyze Report</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
