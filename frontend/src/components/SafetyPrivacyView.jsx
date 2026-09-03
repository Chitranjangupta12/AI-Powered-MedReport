import React from 'react';
import { ShieldCheck, Lock, Trash2, AlertTriangle, CheckCircle, FileText, Activity } from 'lucide-react';

export default function SafetyPrivacyView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dark-card glowing-border" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <ShieldCheck size={18} />
          <span>Patient Medical Privacy & Clinical Governance</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)', marginTop: '0.35rem' }}>
          Clinical AI Safety Architecture & Privacy Protections
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          We treat all uploaded clinical documents as sensitive Protected Health Information (PHI). Our multi-layer privacy and safety architecture enforces de-identification, ephemeral file handling, strict non-diagnostic boundaries, and complete patient data deletion.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={18} color="var(--primary)" />
            <span>1. PII Redaction & De-Identification</span>
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Before passing extracted document text to reasoning engines, automated sanitization middleware redacts Social Security Numbers, government identifiers, contact emails, and phone numbers.
          </p>
        </div>

        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trash2 size={18} color="var(--primary)" />
            <span>2. Instant Data Deletion (Right to be Forgotten)</span>
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Users maintain full sovereignty over their records. Clicking "Delete Report" purges the original file from disk storage and deletes all database records, terminating conversational context.
          </p>
        </div>

        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="#f87171" />
            <span>3. Non-Prescriptive Safety Guardrail</span>
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            The AI is strictly constrained against prescribing medications, suggesting dosage titrations, or recommending changes to prescription regimens. All drug modifications require licensed medical supervision.
          </p>
        </div>

        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} color="var(--primary)" />
            <span>4. Emergency Triage Escalation</span>
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Whenever critical laboratory panic values or acute symptoms (chest pressure, severe dyspnea) are encountered, the system triggers high-urgency RED alerts instructing immediate professional medical care.
          </p>
        </div>
      </div>
    </div>
  );
}
