import React, { useState } from 'react';
import {
  FileText, ShieldCheck, Eye, EyeOff, CheckCircle2,
  AlertCircle, AlertTriangle, HelpCircle, Heart, BookOpen,
  ExternalLink, Copy, Check, Terminal, Clock, MapPin, User, Stethoscope
} from 'lucide-react';
import UrgencyBadge from './UrgencyBadge';
import LabResultsTable from './LabResultsTable';
import AngiogramBreakdown from './AngiogramBreakdown';
import RadiologyView from './RadiologyView';
import EcgView from './EcgView';
import ClinicalDocumentView from './ClinicalDocumentView';
import DebugTraceModal from './DebugTraceModal';
import ReportSummaryCards from './ReportSummaryCards';

export default function ReportSummary({ report, result }) {
  const [hidePhi, setHidePhi] = useState(false);
  const [copiedQuestionIdx, setCopiedQuestionIdx] = useState(null);
  const [showDebugModal, setShowDebugModal] = useState(false);

  if (!result) {
    return (
      <div className="dark-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
        <FileText size={48} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: 'var(--text-bright)', fontWeight: 700 }}>No Medical Report Selected</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Please upload a medical report or choose a sample report to review findings.
        </p>
      </div>
    );
  }

  // Honest Failure State Check (Requirement 17)
  if (result.code === 'EXTRACTION_FAILED' || result.extraction_status === 'FAILED_UNCERTAIN' || result.confidence === 0) {
    return (
      <div className="dark-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.04)', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>
          <AlertCircle size={28} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Unable to Confidently Analyze This Report</h2>
        </div>
        <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          We could not reliably extract enough clear clinical information from this document to guarantee medical accuracy. To prevent patient harm, our Agentic safety protocol refuses to substitute sample data or guess unclear values.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pages Processed</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)' }}>{result.source_pages?.length || 1}</div>
          </div>
          <div style={{ background: 'var(--bg-card-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OCR Status</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>Low Resolution / Unclear</div>
          </div>
          <div style={{ background: 'var(--bg-card-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Extraction Integrity</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171' }}>Verification Required</div>
          </div>
        </div>

        {result.fields_requiring_verification && (
          <div style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ fontSize: '0.85rem', color: '#fbbf24' }}>Fields Requiring Verification:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {result.fields_requiring_verification.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const structured = result.structured_report || {};
  const patient = structured.patient_information || {};
  const facility = structured.facility_information || {};

  const copyQuestion = (q, idx) => {
    navigator.clipboard.writeText(q);
    setCopiedQuestionIdx(idx);
    setTimeout(() => setCopiedQuestionIdx(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Report Header Card */}
      <div className="dark-card glowing-border">
        <div className="dark-card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(6, 182, 212, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(6, 182, 212, 0.25)'
              }}>
                {result.document_category ? result.document_category.replace(/_/g, ' ') : 'MEDICAL REPORT'}
              </span>
              <span className={`confidence-pill ${result.confidence >= 0.85 ? 'high' : 'medium'}`}>
                {Math.round((result.confidence || 0.95) * 100)}% Extraction Confidence
              </span>
            </div>

            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
              {result.report_type || 'Clinical Medical Report'}
            </h1>

            {report && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Source: <span style={{ color: '#38bdf8' }}>{report.original_filename}</span> • Processed {new Date(result.created_at || Date.now()).toLocaleDateString()}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {result.debug_trace && (
              <button
                onClick={() => setShowDebugModal(true)}
                className="chat-action-btn"
                style={{ padding: '0.45rem 0.75rem', color: '#38bdf8' }}
                title="View safe multimodal document ingestion & RAG execution trace"
              >
                <Terminal size={14} />
                <span>Developer Trace</span>
              </button>
            )}
            <UrgencyBadge category={result.urgency_category} urgency={result.urgency} />
          </div>
        </div>

        {/* 2. Patient & Report Details (with Privacy Toggle) */}
        <div style={{
          background: 'var(--bg-card-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              DOCUMENT TELEMETRY & PATIENT CONTEXT
            </span>
            <button
              onClick={() => setHidePhi(!hidePhi)}
              className="chat-action-btn"
              title="Toggle Protected Health Information Redaction"
            >
              {hidePhi ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{hidePhi ? 'Show Details' : 'Hide Sensitive Details (PHI)'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Patient Name: </span>
              <strong style={{ color: 'var(--text-main)' }}>
                {hidePhi ? '•••••••• ••••' : (patient.name || 'Not Disclosed')}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Age / Gender: </span>
              <strong style={{ color: 'var(--text-main)' }}>
                {patient.age || '--'} / {patient.gender || '--'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Facility / Lab: </span>
              <strong style={{ color: 'var(--text-main)' }}>
                {facility.name || 'Accredited Diagnostics'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Pages Analyzed: </span>
              <strong style={{ color: '#38bdf8' }}>
                {result.source_pages?.length || 1} page(s)
              </strong>
            </div>
          </div>
        </div>

        {/* Plain-Language Narrative Summary */}
        <div style={{
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
            <FileText size={17} />
            Plain-Language Clinical Overview
          </div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.6 }}>
            {result.summary}
          </p>
        </div>
      </div>

      {/* 3. Dynamic Summary Cards & Highlights */}
      <ReportSummaryCards result={result} />

      {/* 4. Uncertain Handwriting / Verification Warning Banner */}
      {result.uncertain_fields && result.uncertain_fields.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem'
        }}>
          <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#f87171', fontSize: '0.85rem' }}>
              Handwritten & Visual Verification Notice:
            </strong>
            <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: '0.2rem 0 0 0', lineHeight: 1.4 }}>
              Certain handwritten notes or diagrams in this report ({result.uncertain_fields.length} item(s)) were tagged as requiring clinical verification. Please verify the physical document directly with your physician.
            </p>
          </div>
        </div>
      )}

      {/* 5. Adaptive Specialized Results Section */}
      {result.angiogram_data && (
        <AngiogramBreakdown angiogramData={result.angiogram_data} />
      )}

      {result.document_category === 'RADIOLOGY' && (
        <RadiologyView report={report} structuredReport={result.structured_report} />
      )}

      {result.document_category === 'CARDIOLOGY_ECG' && (
        <EcgView structuredReport={result.structured_report} />
      )}

      {['DISCHARGE_SUMMARY', 'PATHOLOGY', 'CLINICAL_NOTE', 'PRESCRIPTION_MEDICATION', 'UNKNOWN'].includes(result.document_category) && (
        <ClinicalDocumentView structuredReport={result.structured_report} />
      )}

      {(result.document_category === 'LABORATORY' || (!result.document_category && (result.normal_findings?.length > 0 || result.abnormal_findings?.length > 0))) && (
        <LabResultsTable
          normalFindings={result.normal_findings || []}
          abnormalFindings={result.abnormal_findings || []}
        />
      )}

      {/* 6. Questions for Doctor Card */}
      {result.questions_for_doctor && result.questions_for_doctor.length > 0 && (
        <div className="dark-card">
          <div className="dark-card-header">
            <div className="dark-card-title">
              <HelpCircle size={18} color="var(--primary)" />
              <span>Questions to Discuss With Your Healthcare Professional</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Tailored from Extracted Findings
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {result.questions_for_doctor.map((q, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.7rem 0.95rem',
                  fontSize: '0.88rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ color: 'var(--text-main)' }}>"{q}"</span>
                <button
                  onClick={() => copyQuestion(q, idx)}
                  className="chat-action-btn"
                  title="Copy question"
                >
                  {copiedQuestionIdx === idx ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                  <span style={{ color: copiedQuestionIdx === idx ? '#34d399' : 'inherit' }}>
                    {copiedQuestionIdx === idx ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. General Health Guidance & Authoritative Sources Card */}
      <div className="dark-card">
        {result.general_guidance && result.general_guidance.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div className="dark-card-title" style={{ marginBottom: '0.6rem' }}>
              <Heart size={18} color="var(--primary)" />
              <span>Evidence-Based Health & Wellness Information</span>
            </div>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {result.general_guidance.map((g, idx) => (
                <li key={idx} style={{ marginBottom: '0.35rem' }}>{g}</li>
              ))}
            </ul>
          </div>
        )}

        {result.sources && result.sources.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <BookOpen size={14} />
              Authoritative Medical Knowledge Citations (RAG)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {result.sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.76rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{src.organization || src.title}</span>
                  <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Developer Debug Execution Modal */}
      <DebugTraceModal
        debugTrace={result.debug_trace}
        isOpen={showDebugModal}
        onClose={() => setShowDebugModal(false)}
      />
    </div>
  );
}
