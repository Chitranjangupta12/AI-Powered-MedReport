import React from 'react';
import { Activity, Clock, Zap, Heart } from 'lucide-react';

export default function EcgView({ structuredReport }) {
  if (!structuredReport) return null;

  const observations = structuredReport.observations || [];
  const impressions = structuredReport.impressions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Rhythm & Interpretation Banner */}
      {impressions.length > 0 && (
        <div className="dark-card" style={{ borderLeft: '4px solid #f43f5e', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#fb7185', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            <Activity size={18} />
            <span>ECG Rhythm & Electrocardiographic Interpretation</span>
          </div>
          {impressions.map((imp, idx) => (
            <p key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0.2rem 0', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-bright)' }}>Interpretation:</strong> {imp.text} <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>[Page {imp.source_page || 1}]</span>
            </p>
          ))}
        </div>
      )}

      {/* Intervals & Numerical Metrics Grid */}
      {observations.length > 0 && (
        <div className="dark-card" style={{ padding: '1.25rem' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Clock size={16} color="var(--primary)" />
            <span>Cardiac Conduction Intervals & Waveform Metrics</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            {observations.map((obs, oIdx) => (
              <div
                key={oIdx}
                style={{
                  background: 'var(--bg-card-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem'
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {obs.parameter}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-bright)', marginTop: '0.25rem', fontFamily: "'JetBrains Mono', monospace" }}>
                  {obs.result_value} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>{obs.unit || ''}</span>
                </div>
                {obs.reference_range && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    Normal: {obs.reference_range}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
