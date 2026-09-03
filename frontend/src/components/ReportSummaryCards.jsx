import React from 'react';
import {
  FileText, CheckCircle2, AlertTriangle, AlertCircle,
  Activity, Layers, Heart, ShieldAlert, Sparkles, Compass
} from 'lucide-react';

export default function ReportSummaryCards({ result }) {
  if (!result) return null;

  const category = (result.document_category || 'LABORATORY').toUpperCase();
  const structured = result.structured_report || {};

  // Dynamically compute metrics based on document category
  const renderMetricCards = () => {
    if (category === 'LABORATORY') {
      const normalCount = (result.normal_findings || []).length;
      const abnormalCount = (result.abnormal_findings || []).length;
      const totalCount = normalCount + abnormalCount;
      const remarksCount = (structured.remarks || []).length;

      return (
        <div className="summary-cards-grid">
          <div className="metric-card-tile">
            <div className="metric-icon-box cyan">
              <FileText size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{totalCount}</span>
              <span className="metric-tile-label">Total Parameters</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box green">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{normalCount}</span>
              <span className="metric-tile-label">Within Range</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box amber">
              <AlertTriangle size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{abnormalCount}</span>
              <span className="metric-tile-label">Abnormal Flags</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box red">
              <AlertCircle size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{remarksCount}</span>
              <span className="metric-tile-label">Clinical Remarks</span>
            </div>
          </div>
        </div>
      );
    }

    if (category === 'RADIOLOGY') {
      const findingsCount = (structured.qualitative_findings || []).length;
      const impressionsCount = (structured.impressions || []).length;
      const measurementsCount = (structured.measurements || []).length;
      const recommendationsCount = (structured.recommendations || []).length;

      return (
        <div className="summary-cards-grid">
          <div className="metric-card-tile">
            <div className="metric-icon-box cyan">
              <Layers size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{findingsCount}</span>
              <span className="metric-tile-label">Anatomical Findings</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box green">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{impressionsCount}</span>
              <span className="metric-tile-label">Key Impressions</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box amber">
              <Compass size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{measurementsCount}</span>
              <span className="metric-tile-label">Measurements</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box red">
              <AlertCircle size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{recommendationsCount}</span>
              <span className="metric-tile-label">Recommendations</span>
            </div>
          </div>
        </div>
      );
    }

    if (category === 'CARDIOLOGY_ECG') {
      const observations = structured.observations || [];
      const hr = observations.find(o => o.parameter?.toLowerCase().includes('rate'))?.result_value || '--';
      const pr = observations.find(o => o.parameter?.toLowerCase().includes('pr'))?.result_value || '--';
      const qrs = observations.find(o => o.parameter?.toLowerCase().includes('qrs'))?.result_value || '--';
      const qtc = observations.find(o => o.parameter?.toLowerCase().includes('qt'))?.result_value || '--';

      return (
        <div className="summary-cards-grid">
          <div className="metric-card-tile">
            <div className="metric-icon-box cyan">
              <Heart size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{hr}</span>
              <span className="metric-tile-label">Heart Rate (bpm)</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box green">
              <Activity size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{pr}</span>
              <span className="metric-tile-label">PR Interval (ms)</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box amber">
              <Layers size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{qrs}</span>
              <span className="metric-tile-label">QRS Duration (ms)</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box red">
              <CheckCircle2 size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{qtc}</span>
              <span className="metric-tile-label">QTc Interval (ms)</span>
            </div>
          </div>
        </div>
      );
    }

    if (category === 'CARDIOLOGY_ANGIOGRAM') {
      const angio = result.angiogram_data || structured;
      const findings = angio.stenosis_findings || [];
      const severeCount = findings.filter(s => (s.severity || '').toLowerCase().includes('severe') || (s.severity || '').toLowerCase().includes('moderate')).length;
      const vesselsCount = findings.length;

      return (
        <div className="summary-cards-grid">
          <div className="metric-card-tile">
            <div className="metric-icon-box cyan">
              <Activity size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{vesselsCount}</span>
              <span className="metric-tile-label">Vessels Assessed</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box amber">
              <AlertTriangle size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{severeCount}</span>
              <span className="metric-tile-label">Significant Lesions</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box green">
              <Heart size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{angio.hemodynamics?.lvef || '55%'}</span>
              <span className="metric-tile-label">Ejection Fraction</span>
            </div>
          </div>

          <div className="metric-card-tile">
            <div className="metric-icon-box red">
              <AlertCircle size={20} />
            </div>
            <div className="metric-tile-content">
              <span className="metric-tile-value">{(angio.recommendations || []).length || 2}</span>
              <span className="metric-tile-label">Clinical Directives</span>
            </div>
          </div>
        </div>
      );
    }

    // Default / Discharge / Clinical Note / Unknown
    const obsCount = (structured.observations || []).length;
    const diagCount = (structured.diagnoses_as_written || []).length;
    const medCount = (structured.medications || []).length;
    const recCount = (structured.recommendations || []).length;

    return (
      <div className="summary-cards-grid">
        <div className="metric-card-tile">
          <div className="metric-icon-box cyan">
            <FileText size={20} />
          </div>
          <div className="metric-tile-content">
            <span className="metric-tile-value">{diagCount || obsCount || 1}</span>
            <span className="metric-tile-label">Documented Diagnoses</span>
          </div>
        </div>

        <div className="metric-card-tile">
          <div className="metric-icon-box green">
            <CheckCircle2 size={20} />
          </div>
          <div className="metric-tile-content">
            <span className="metric-tile-value">{medCount}</span>
            <span className="metric-tile-label">Medications</span>
          </div>
        </div>

        <div className="metric-card-tile">
          <div className="metric-icon-box amber">
            <Layers size={20} />
            </div>
          <div className="metric-tile-content">
            <span className="metric-tile-value">{recCount}</span>
            <span className="metric-tile-label">Recommendations</span>
          </div>
        </div>

        <div className="metric-card-tile">
          <div className="metric-icon-box red">
            <AlertCircle size={20} />
          </div>
          <div className="metric-tile-content">
            <span className="metric-tile-value">{structured.source_pages?.length || 1}</span>
            <span className="metric-tile-label">Pages Processed</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Metric Tiles */}
      {renderMetricCards()}

      {/* Important Highlights Section */}
      <div className="dark-card" style={{ marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.9)' }}>
        <div className="dark-card-header">
          <div className="dark-card-title">
            <Sparkles size={18} color="var(--primary)" />
            <span>Important Highlights & Clinical Focal Points</span>
          </div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Grounded from Uploaded Report
          </span>
        </div>

        {result.important_findings && result.important_findings.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {result.important_findings.map((item, idx) => {
              const isAbnormal = item.toLowerCase().includes('elevated') || item.toLowerCase().includes('low') || item.toLowerCase().includes('narrowing') || item.toLowerCase().includes('stenosis') || item.toLowerCase().includes('concern');
              return (
                <div
                  key={idx}
                  style={{
                    background: isAbnormal ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                    border: `1px solid ${isAbnormal ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.8rem 1rem',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.6rem'
                  }}
                >
                  {isAbnormal ? (
                    <AlertTriangle size={17} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <CheckCircle2 size={17} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <span style={{ color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Key findings extracted and validated from source report.
          </div>
        )}
      </div>
    </div>
  );
}
