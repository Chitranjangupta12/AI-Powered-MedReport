import React from 'react';
import { Eye, Layers, Compass, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RadiologyView({ report, structuredReport }) {
  if (!structuredReport) return null;

  const impressions = structuredReport.impressions || [];
  const findings = structuredReport.qualitative_findings || [];
  const measurements = structuredReport.measurements || [];
  const recommendations = structuredReport.recommendations || [];
  const procedures = structuredReport.procedures || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Imaging Technique Header */}
      {procedures.length > 0 && (
        <div className="dark-card" style={{ background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.25)', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.3rem' }}>
            <Compass size={16} />
            <span>Radiological Technique & Study Specifications</span>
          </div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.86rem', margin: 0 }}>
            {procedures[0].technique || procedures[0].name}
          </p>
        </div>
      )}

      {/* Impression Section */}
      {impressions.length > 0 && (
        <div className="dark-card" style={{ borderLeft: '4px solid #38bdf8', padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Eye size={18} color="#38bdf8" />
            <span>Radiological Impression & Diagnostic Takeaway</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {impressions.map((imp, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-card-elevated)',
                  padding: '0.8rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.5
                }}
              >
                <strong style={{ color: '#38bdf8' }}>Impression: </strong> {imp.text}
                <span style={{ marginLeft: '0.5rem', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                  [Page {imp.source_page || 1}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anatomical Findings */}
      {findings.length > 0 && (
        <div className="dark-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Layers size={18} color="var(--primary)" />
            <span>Anatomical & Structure-by-Structure Findings</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {findings.map((f, fIdx) => (
              <div
                key={fIdx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem',
                  padding: '0.65rem 0',
                  borderBottom: fIdx < findings.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {f.finding} <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>[Page {f.source_page || 1}]</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="dark-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AlertCircle size={16} />
            <span>Radiologist Recommendations</span>
          </h4>
          <ul style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-main)', fontSize: '0.86rem' }}>
            {recommendations.map((r, rIdx) => (
              <li key={rIdx} style={{ marginBottom: '0.25rem' }}>
                {r.text} <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>[Page {r.source_page || 1}]</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
