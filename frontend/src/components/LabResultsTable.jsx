import React, { useState } from 'react';
import { Filter, Info, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export default function LabResultsTable({ normalFindings = [], abnormalFindings = [] }) {
  const [filter, setFilter] = useState('all'); // 'all', 'abnormal', 'normal'
  const [expandedIndex, setExpandedIndex] = useState(null);

  const allItems = [
    ...abnormalFindings.map(item => ({ ...item, isAbnormal: true })),
    ...normalFindings.map(item => ({ ...item, isAbnormal: false }))
  ];

  const filteredItems = allItems.filter(item => {
    if (filter === 'abnormal') return item.isAbnormal;
    if (filter === 'normal') return !item.isAbnormal;
    return true;
  });

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getStatusPill = (status = '', isAbnormal = false) => {
    const s = status.toLowerCase();
    if (s.includes('critical') || s.includes('high') || s.includes('elevated')) {
      return (
        <span className="badge-status-pill red">
          <AlertCircle size={12} />
          {status || 'HIGH'}
        </span>
      );
    }
    if (s.includes('low')) {
      return (
        <span className="badge-status-pill yellow">
          <AlertTriangle size={12} />
          {status || 'LOW'}
        </span>
      );
    }
    if (isAbnormal) {
      return (
        <span className="badge-status-pill yellow">
          <AlertTriangle size={12} />
          {status || 'ABNORMAL'}
        </span>
      );
    }
    return (
      <span className="badge-status-pill green">
        <CheckCircle2 size={12} />
        {status || 'NORMAL'}
      </span>
    );
  };

  return (
    <div className="dark-card">
      <div className="dark-card-header">
        <div className="dark-card-title">
          <Info size={18} color="var(--primary)" />
          <span>Laboratory Analyte Breakdown ({allItems.length} Parameters)</span>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.8rem' }}>
          <button
            className={`top-btn-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
          >
            All ({allItems.length})
          </button>
          <button
            className={`top-btn-pill ${filter === 'abnormal' ? 'active' : ''}`}
            onClick={() => setFilter('abnormal')}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: filter === 'abnormal' ? '#f87171' : 'inherit' }}
          >
            Abnormal ({abnormalFindings.length})
          </button>
          <button
            className={`top-btn-pill ${filter === 'normal' ? 'active' : ''}`}
            onClick={() => setFilter('normal')}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', color: filter === 'normal' ? '#34d399' : 'inherit' }}
          >
            Normal ({normalFindings.length})
          </button>
        </div>
      </div>

      <div className="dark-table-wrapper">
        <table className="dark-medical-table">
          <thead>
            <tr>
              <th>Analyte / Parameter</th>
              <th>Result Value</th>
              <th>Unit</th>
              <th>Reference Interval</th>
              <th>Clinical Flag</th>
              <th>Confidence</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <React.Fragment key={idx}>
                  <tr
                    onClick={() => toggleExpand(idx)}
                    style={{ cursor: 'pointer', transition: 'background 0.15s ease' }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isExpanded ? <ChevronUp size={14} color="var(--text-dim)" /> : <ChevronDown size={14} color="var(--text-dim)" />}
                        <strong style={{ color: 'var(--text-bright)' }}>{item.parameter}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 700,
                        color: item.isAbnormal ? '#f87171' : 'var(--text-main)',
                        fontSize: '0.95rem'
                      }}>
                        {item.result_value}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                      {item.unit || '--'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {item.reference_range || (
                        <span style={{ fontSize: '0.74rem', color: '#fbbf24' }}>Omitted / Uncertain</span>
                      )}
                    </td>
                    <td>
                      {getStatusPill(item.status, item.isAbnormal)}
                    </td>
                    <td>
                      <span className={`confidence-pill ${(item.confidence || 0.95) >= 0.85 ? 'high' : 'medium'}`}>
                        {Math.round((item.confidence || 0.95) * 100)}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        Page {item.source_page || 1}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--bg-card-elevated)', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-medium)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            <strong style={{ color: 'var(--primary)' }}>Clinical Explanation: </strong>
                            {item.explanation || 'This value was extracted directly from your laboratory report. Your healthcare provider interprets this parameter in relation to your overall medical history.'}
                          </div>
                          {item.clinical_significance && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              <strong>Significance: </strong> {item.clinical_significance}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
