import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, HelpCircle, Layers } from 'lucide-react';

export default function AngiogramBreakdown({ angiogramData }) {
  if (!angiogramData || !angiogramData.stenosis_findings || angiogramData.stenosis_findings.length === 0) {
    return null;
  }

  const getSeverityBadge = (severity = '') => {
    const s = severity.toLowerCase();
    if (s.includes('severe') || s.includes('critical') || s.includes('occlusion')) {
      return { pillClass: 'badge-status-pill red', label: 'Severe' };
    }
    if (s.includes('moderate')) {
      return { pillClass: 'badge-status-pill yellow', label: 'Moderate' };
    }
    return { pillClass: 'badge-status-pill green', label: 'Mild / Patent' };
  };

  return (
    <div className="dark-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
          <Activity size={18} color="#38bdf8" />
          <span>Coronary Artery Assessment & Luminal Stenosis Findings</span>
        </h4>
        <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.2rem 0.55rem', borderRadius: '4px', fontWeight: 600, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          Multimodal Fluoroscopy & Vision
        </span>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
        Evaluation of epicardial coronary circulation across <strong>{angiogramData.source_pages?.length || 1} page(s)</strong>.
        Stenosis percentage measures the reduction in vessel lumen caliber compared to adjacent normal segments.
      </p>

      {/* Artery Findings List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        {angiogramData.stenosis_findings.map((item, idx) => {
          const badge = getSeverityBadge(item.severity);
          return (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-bright)' }}>
                  {item.artery}
                </span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  ({item.segment || 'Segment'})
                </span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                  Page {item.source_page || 1}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-bright)' }}>
                  {item.stenosis_percentage || item.result_value}
                </span>
                <span className={badge.pillClass}>
                  {badge.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Hemodynamics / Ventriculography Footer */}
      {angiogramData.hemodynamics && (
        <div style={{
          background: 'rgba(6, 182, 212, 0.05)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 0.95rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Estimated Left Ventricular Ejection Fraction (LVEF):</span>
          <strong style={{ color: '#38bdf8' }}>{angiogramData.hemodynamics.lvef || '55%'}</strong>
        </div>
      )}
    </div>
  );
}
