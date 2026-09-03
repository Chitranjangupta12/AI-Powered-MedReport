import React from 'react';
import { Settings, Shield, User, Bell, Sliders, Database } from 'lucide-react';

export default function SettingsView({ elderMode, onToggleElderMode, language, onLanguageChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dark-card glowing-border">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
          <Settings size={18} />
          <span>Application Preferences</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)', marginTop: '0.35rem' }}>
          System & Accessibility Settings
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Configure readability, language localization, speech speeds, and data privacy options.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Elder-Friendly Mode */}
        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👵</span>
            <span>Elder-Friendly Mode</span>
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Increases font sizes (+25%), expands touch target buttons to at least 48px, and enhances color contrast for easier reading.
          </p>
          <button
            onClick={onToggleElderMode}
            className={`top-btn-pill ${elderMode ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {elderMode ? 'Elder-Friendly Mode is ENABLED' : 'Enable Elder-Friendly Mode'}
          </button>
        </div>

        {/* Language Selection */}
        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={18} color="var(--primary)" />
            <span>Default Assistant Language</span>
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Select your preferred language for explanations, voice speech-to-text recognition, and read-aloud summaries.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['en', 'hi', 'hinglish'].map(l => (
              <button
                key={l}
                onClick={() => onLanguageChange(l)}
                className={`top-btn-pill ${language === l ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {l === 'en' ? 'English' : (l === 'hi' ? 'हिन्दी' : 'Hinglish')}
              </button>
            ))}
          </div>
        </div>

        {/* Data Governance & Storage */}
        <div className="dark-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} color="var(--primary)" />
            <span>Local Storage & Cache</span>
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Medical reports and chat dialogues are stored securely on your server instance with automatic PII redaction.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Status: Standalone Resilient Store Active
          </div>
        </div>
      </div>
    </div>
  );
}
