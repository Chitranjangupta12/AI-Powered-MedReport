import React, { useState } from 'react';
import { Terminal, Shield, Check, Info, AlertTriangle, Layers, Cpu } from 'lucide-react';

export default function DebugTraceModal({ debugTrace, isOpen, onClose }) {
  if (!isOpen || !debugTrace) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '650px', background: '#0f172a', color: '#f8fafc', border: '1px solid #334155' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: '#38bdf8' }}>
            <Terminal size={18} />
            Safe Execution Debug View (Developer Trace)
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.4 }}>
          Safe runtime execution metadata showing document ingestion classification, multi-page OCR & vision analyzer status, tools invoked, and verified RAG citations without exposing private chain-of-thought.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>DOCUMENT CLASSIFICATION</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase' }}>
              {debugTrace.document_type || 'Unknown'} {debugTrace.is_scanned ? '(Scanned / Image)' : '(Digital Text)'}
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>NUMBER OF PAGES</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
              {debugTrace.number_of_pages || 1} Page(s) Processed
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>OCR PIPELINE STATUS</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4ade80' }}>
              {debugTrace.ocr_status || 'Active'}
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>VISION ANALYSIS</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8' }}>
              {debugTrace.vision_analysis_status || 'Active'}
            </div>
          </div>
        </div>

        {/* Tools Used */}
        <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
            AGENTIC TOOLS INVOKED:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {debugTrace.tools_used?.map((tool, idx) => (
              <span key={idx} style={{ background: '#0369a1', color: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                {tool}
              </span>
            ))}
          </div>
        </div>

        {/* RAG Retrieved Sources */}
        <div style={{ background: '#1e293b', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
            VERIFIED RAG KNOWLEDGE SOURCES ({debugTrace.rag_retrieval_count || 0}):
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#cbd5e1' }}>
            {debugTrace.rag_sources?.map((src, sIdx) => (
              <li key={sIdx}>{src}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: '#38bdf8', color: '#0f172a', fontWeight: 700, padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
          >
            Close Debug View
          </button>
        </div>
      </div>
    </div>
  );
}
