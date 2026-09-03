import React, { useState } from 'react';
import { History, Trash2, FileText, AlertCircle, Calendar, Layers, Eye } from 'lucide-react';
import UrgencyBadge from './UrgencyBadge';
import { api } from '../services/api';

export default function ReportHistory({ reports = [], activeReportId, onSelectReport, onDeleteReport }) {
  const [isDeleting, setIsDeleting] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this report and purge associated medical context?')) {
      try {
        setIsDeleting(id);
        await api.deleteReport(id);
        onDeleteReport(id);
        setIsDeleting(null);
      } catch (err) {
        setIsDeleting(null);
        alert('Failed to delete report.');
      }
    }
  };

  if (reports.length === 0) {
    return (
      <div className="dark-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <History size={28} color="var(--text-dim)" style={{ margin: '0 auto 0.5rem auto' }} />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          No previous reports stored yet.
        </p>
      </div>
    );
  }

  return (
    <div className="dark-card">
      <div className="dark-card-header">
        <div className="dark-card-title" style={{ fontSize: '0.95rem' }}>
          <History size={16} color="var(--primary)" />
          <span>Report History ({reports.length})</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Encrypted & Ephemeral
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
        {reports.map((rep) => {
          const isActive = rep.id === activeReportId;
          return (
            <div
              key={rep.id}
              onClick={() => onSelectReport(rep.id)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${isActive ? 'rgba(6, 182, 212, 0.4)' : 'var(--border-subtle)'}`,
                background: isActive ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card-elevated)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileText size={18} color={isActive ? 'var(--primary)' : 'var(--text-dim)'} />
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: isActive ? '#38bdf8' : 'var(--text-bright)' }}>
                    {rep.original_filename}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                    <Calendar size={11} />
                    <span>{new Date(rep.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{(rep.file_size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  onClick={(e) => handleDelete(e, rep.id)}
                  style={{
                    color: 'var(--text-dim)',
                    padding: '0.3rem',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#f87171'}
                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
                  title="Delete report permanently"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
