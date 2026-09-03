import React from 'react';
import { FileText, Stethoscope, Pill, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function ClinicalDocumentView({ structuredReport }) {
  if (!structuredReport) return null;

  const diagnoses = structuredReport.diagnoses_as_written || [];
  const procedures = structuredReport.procedures || [];
  const medications = structuredReport.medications || [];
  const recommendations = structuredReport.recommendations || [];
  const sections = structuredReport.sections || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Diagnoses As Documented */}
      {diagnoses.length > 0 && (
        <div className="dark-card" style={{ borderLeft: '4px solid #a855f7', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#c084fc', fontWeight: 800, fontSize: '0.96rem', marginBottom: '0.6rem' }}>
            <Stethoscope size={18} />
            <span>Documented Clinical Diagnoses</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>
            {diagnoses.map((d, dIdx) => (
              <li key={dIdx} style={{ marginBottom: '0.35rem' }}>
                {d.text} <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>[Page {d.source_page || 1}]</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Procedures */}
      {procedures.length > 0 && (
        <div className="dark-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.5rem' }}>
            Procedures & Interventions Performed
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.86rem' }}>
            {procedures.map((p, pIdx) => (
              <li key={pIdx} style={{ marginBottom: '0.25rem' }}>
                {p.name || p.technique} <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>[Page {p.source_page || 1}]</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prescribed Medications */}
      {medications.length > 0 && (
        <div className="dark-card" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.25)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#34d399', fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.5rem' }}>
            <Pill size={16} />
            <span>Documented Medications</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.86rem' }}>
            {medications.map((m, mIdx) => (
              <li key={mIdx} style={{ marginBottom: '0.25rem' }}>
                {m.name} <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>[Page {m.source_page || 1}]</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-up & Discharge Directives */}
      {recommendations.length > 0 && (
        <div className="dark-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowRight size={16} />
            <span>Follow-up & Physician Instructions</span>
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            {recommendations.map((r, rIdx) => (
              <li key={rIdx} style={{ marginBottom: '0.25rem' }}>
                {r.text} <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>[Page {r.source_page || 1}]</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
