import React from 'react';
import { HelpCircle, FileQuestion, MessageSquare, PhoneCall, ExternalLink, ShieldCheck } from 'lucide-react';

export default function HelpSupportView() {
  const faqs = [
    {
      q: 'What types of medical reports can I upload?',
      a: 'You can upload PDF files, scanned images (PNG, JPG), or photos of Laboratory reports (CBC, Lipid, LFT, KFT), Radiology reports (X-Rays, CT, MRI, Ultrasounds), Cardiology diagnostics (12-Lead ECG, Echocardiogram, Coronary Angiograms), Surgical Pathology biopsies, and Hospital Discharge Summaries.'
    },
    {
      q: 'Does the system replace my physician or provide a medical diagnosis?',
      a: 'No. The system functions strictly as an educational clinical assistant to help patients understand complex laboratory metrics, reference ranges, and terminology. It does not prescribe medications, adjust dosages, or establish autonomous medical diagnoses.'
    },
    {
      q: 'How does the Voice Assistant work in Hindi and Hinglish?',
      a: 'You can speak directly into your microphone in English, Hindi, or conversational Hinglish. The Agentic AI processes your inquiry in the context of your uploaded document and replies with both a spoken voice readout and text responses.'
    },
    {
      q: 'What happens if a handwritten note or table is blurry or unclear?',
      a: 'The system will never guess or invent fake data. It will explicitly tag the observation as "Needs Verification" and alert you with a prominent notice to verify the physical report with your doctor.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dark-card glowing-border">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase' }}>
          <HelpCircle size={18} />
          <span>Patient Help Center</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)', marginTop: '0.35rem' }}>
          Frequently Asked Questions & Patient Guidance
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          Guidance on interpreting clinical reports, utilizing voice interactions, and understanding our patient safety protocols.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {faqs.map((faq, idx) => (
          <div key={idx} className="dark-card" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <FileQuestion size={16} color="var(--primary)" />
              <span>{faq.q}</span>
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6, paddingLeft: '1.5rem' }}>
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
