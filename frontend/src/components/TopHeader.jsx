import React from 'react';
import { Upload, Globe, Eye, Sparkles, ShieldCheck, Menu } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../utils/multilingual';

export default function TopHeader({
  onOpenUpload,
  elderMode,
  onToggleElderMode,
  language,
  onLanguageChange,
  activeReport,
  onToggleMobileMenu
}) {
  return (
    <header className="top-header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Mobile Hamburger Button */}
        <button
          className="top-header-hamburger"
          onClick={onToggleMobileMenu}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Title / Breadcrumb */}
        <div className="header-title-group">
          <h2>Report Analysis</h2>
          <p>
            {activeReport ? (
              <span>Analyzing: <strong style={{ color: '#38bdf8' }}>{activeReport.original_filename}</strong></span>
            ) : (
              'Clinical Understanding & Patient Empowerment Assistant'
            )}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="header-action-group">
        {/* Elder-Friendly View Button */}
        <button
          className={`top-btn-pill ${elderMode ? 'active' : ''}`}
          onClick={onToggleElderMode}
          title="Enable High Contrast & Enlarged Text for Elderly Patients"
        >
          <span style={{ fontSize: '1rem' }}>👵</span>
          <span>Elder-Friendly View {elderMode ? '(ON)' : ''}</span>
        </button>

        {/* Multilingual Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.6rem' }}>
          <Globe size={15} color="var(--primary)" />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                {lang.nativeLabel}
              </option>
            ))}
          </select>
        </div>

        {/* Prominent Upload Button */}
        <button className="btn-upload-prominent" onClick={onOpenUpload}>
          <Upload size={16} />
          <span>Upload Report</span>
        </button>
      </div>
    </header>
  );
}
