import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import UploadModal from './components/UploadModal';
import ReportSummary from './components/ReportSummary';
import ChatbotWindow from './components/ChatbotWindow';
import ReportHistory from './components/ReportHistory';
import EvaluationDashboard from './components/EvaluationDashboard';
import SafetyPrivacyView from './components/SafetyPrivacyView';
import SavedReportsView from './components/SavedReportsView';
import SettingsView from './components/SettingsView';
import HelpSupportView from './components/HelpSupportView';
import { api } from './services/api';
import { speechService } from './services/speechService';
import { FileUp, ShieldAlert, Sparkles, Upload, Activity } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [elderMode, setElderMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [simpleMode, setSimpleMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [reports, setReports] = useState([]);
  const [activeReportId, setActiveReportId] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const health = await api.checkHealth();
      setBackendHealth(health);

      const reps = await api.getReports();
      if (reps.reports && reps.reports.length > 0) {
        setReports(reps.reports);
        selectReport(reps.reports[0].id);
      }
    } catch (err) {
      console.warn('Backend connection note:', err.message);
    }
  };

  const selectReport = async (reportId) => {
    try {
      setActiveReportId(reportId);
      const data = await api.getReportById(reportId);
      if (data.success) {
        setActiveReport(data.report);
        setActiveResult(data.result);
        setActiveConversationId(data.conversation_id);
      }
    } catch (err) {
      console.error('Failed to fetch report details:', err);
    }
  };

  const handleUploadSuccess = (uploadData) => {
    if (uploadData.report) {
      setReports(prev => [uploadData.report, ...prev]);
      setActiveReportId(uploadData.report.id);
      setActiveReport(uploadData.report);
      setActiveResult(uploadData.result);
      setActiveConversationId(uploadData.conversation_id);
      setActiveTab('dashboard');
    }
  };

  const handleDeleteReport = (deletedId) => {
    const updated = reports.filter(r => r.id !== deletedId);
    setReports(updated);
    if (activeReportId === deletedId) {
      if (updated.length > 0) {
        selectReport(updated[0].id);
      } else {
        setActiveReportId(null);
        setActiveReport(null);
        setActiveResult(null);
        setActiveConversationId(null);
      }
    }
  };

  return (
    <div className={`app-layout-root ${elderMode ? 'elder-mode' : ''}`}>
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        onOpenUpload={() => {
          setIsUploadOpen(true);
          setMobileMenuOpen(false);
        }}
        backendHealth={backendHealth}
        voiceSupported={Boolean(speechService?.isSupported ? speechService.isSupported() : false)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* 2. Main Content Viewport */}
      <div className="app-main-content">
        {/* Top Header */}
        <TopHeader
          onOpenUpload={() => setIsUploadOpen(true)}
          elderMode={elderMode}
          onToggleElderMode={() => setElderMode(prev => !prev)}
          language={language}
          onLanguageChange={setLanguage}
          activeReport={activeReport}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />

        {/* Safety Disclaimer Ribbon */}
        <div className="disclaimer-ribbon">
          <ShieldAlert size={14} style={{ flexShrink: 0 }} />
          <span>
            <strong>Educational Clinical Assistant:</strong> This system assists patients in understanding medical findings. It does not replace a licensed physician, does not provide definitive diagnoses, and does not alter medication dosages.
          </span>
        </div>

        {/* Dynamic Tab Body */}
        <main className="dashboard-workspace-container">
          {activeTab === 'dashboard' && (
            <>
              {reports.length === 0 && !activeResult ? (
                /* Zero State / Onboarding View */
                <div className="dark-card glowing-border" style={{ textAlign: 'center', padding: '4rem 2rem', maxWidth: '750px', margin: '2rem auto' }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 'var(--radius-lg)',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 1.5rem auto', color: 'white', boxShadow: '0 0 24px rgba(6, 182, 212, 0.4)'
                  }}>
                    <FileUp size={32} />
                  </div>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
                    Understand Your Medical Report in Simple Language
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', margin: '0.85rem auto 1.75rem auto', lineHeight: 1.6, maxWidth: '600px' }}>
                    Upload your laboratory test, cardiology tracing, or radiology scan in PDF or image format. Our Agentic AI analyzes observations strictly against reference intervals, retrieves NIH/CDC medical evidence, and enables voice conversations in English, Hindi, and Hinglish.
                  </p>
                  <button className="btn-upload-prominent" onClick={() => setIsUploadOpen(true)} style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
                    <Upload size={18} />
                    <span>Upload Medical Report</span>
                  </button>
                </div>
              ) : (
                /* Responsive Horizontal Scroll Container for Dashboard Workspace */
                <div className="dashboard-scroll-container" tabIndex={0} role="region" aria-label="Medical Report Analysis & Assistant Workspace">
                  <div className="dashboard-inner">
                    <div className="dashboard-two-column-grid">
                      {/* Left Column: Report Analysis, Highlights & Dynamic Breakdown */}
                      <div className="dashboard-report-column">
                        <ReportSummary
                          report={activeReport}
                          result={activeResult}
                        />
                      </div>

                      {/* Right Column: Interactive Medical Assistant & Report History */}
                      <div className="dashboard-assistant-column">
                        <ChatbotWindow
                          conversationId={activeConversationId}
                          reportId={activeReportId}
                          reportResult={activeResult}
                          language={language}
                          onLanguageChange={setLanguage}
                          simpleMode={simpleMode}
                          onToggleSimpleMode={() => setSimpleMode(prev => !prev)}
                        />

                        <ReportHistory
                          reports={reports}
                          activeReportId={activeReportId}
                          onSelectReport={selectReport}
                          onDeleteReport={handleDeleteReport}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'benchmark' && <EvaluationDashboard />}
          {activeTab === 'safety' && <SafetyPrivacyView />}
          {activeTab === 'history' && (
            <ReportHistory
              reports={reports}
              activeReportId={activeReportId}
              onSelectReport={(id) => {
                selectReport(id);
                setActiveTab('dashboard');
              }}
              onDeleteReport={handleDeleteReport}
            />
          )}
          {activeTab === 'saved' && (
            <SavedReportsView
              reports={reports}
              onSelectReport={(id) => {
                selectReport(id);
                setActiveTab('dashboard');
              }}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              elderMode={elderMode}
              onToggleElderMode={() => setElderMode(prev => !prev)}
              language={language}
              onLanguageChange={setLanguage}
            />
          )}
          {activeTab === 'help' && <HelpSupportView />}
        </main>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
