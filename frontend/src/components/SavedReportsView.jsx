import React from 'react';
import { Bookmark, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SavedReportsView({ reports = [], onSelectReport }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dark-card glowing-border">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
          <Bookmark size={18} />
          <span>Patient Vault</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)', marginTop: '0.35rem' }}>
          Saved Clinical Documents & Follow-Ups
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Securely preserved medical records for long-term health tracking and longitudinal physician discussions.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="dark-card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <Bookmark size={36} color="var(--text-dim)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ color: 'var(--text-bright)', fontWeight: 700 }}>No Saved Reports Yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Upload a report or bookmark key findings from the Report Dashboard to access them here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="dark-card"
              onClick={() => onSelectReport(rep.id)}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <FileText size={22} color="var(--primary)" />
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                    {rep.original_filename}
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Uploaded {new Date(rep.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Size: {(rep.file_size / 1024).toFixed(0)} KB
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--primary)', fontWeight: 600 }}>
                  View Analysis →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
