import React from 'react';
import { Activity, Upload, BarChart3, ShieldCheck, FileText, Eye } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenUpload, elderMode, onToggleElderMode }) {
  return (
    <header className="navbar">
      <div className="brand-group">
        <div className="brand-icon">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="brand-title">Agentic AI Medical Report Guidance</h1>
          <p className="brand-subtitle">Clinical Lab Understanding & Patient Empowerment Assistant</p>
        </div>
      </div>

      <nav className="nav-actions">
        <button
          className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <FileText size={16} />
          Report Dashboard
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          <BarChart3 size={16} />
          Research Benchmark
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          <ShieldCheck size={16} />
          Safety & Privacy
        </button>

        {/* Elder-Friendly View Toggle */}
        <button
          onClick={onToggleElderMode}
          className={`nav-tab-btn ${elderMode ? 'active' : ''}`}
          style={{
            background: elderMode ? '#fef3c7' : 'white',
            borderColor: elderMode ? '#f59e0b' : 'var(--slate-200)',
            color: elderMode ? '#92400e' : 'var(--slate-700)',
            fontWeight: 700
          }}
          title="Toggle Large Fonts & High-Contrast Touch Targets for Elderly Users"
        >
          <span>👵</span>
          <span>Elder-Friendly View {elderMode ? '(ON)' : ''}</span>
        </button>

        <button className="primary-btn" onClick={onOpenUpload}>
          <Upload size={16} />
          Upload Report
        </button>
      </nav>
    </header>
  );
}
