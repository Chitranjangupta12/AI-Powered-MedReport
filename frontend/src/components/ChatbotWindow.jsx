import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, User, AlertTriangle, ShieldAlert, Sparkles, Loader2,
  Volume2, RotateCcw, Copy, Check, BookOpen, ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { speechService } from '../services/speechService';
import VoiceAssistantPanel from './VoiceAssistantPanel';
import { SUGGESTED_QUESTIONS, UI_STRINGS } from '../utils/multilingual';

export default function ChatbotWindow({
  conversationId,
  reportId,
  reportResult,
  language = 'en',
  onLanguageChange,
  simpleMode = true,
  onToggleSimpleMode
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [currentlySpeakingIdx, setCurrentlySpeakingIdx] = useState(null);
  const messagesEndRef = useRef(null);

  const strings = UI_STRINGS[language] || UI_STRINGS.en;

  // Load conversation messages or set dynamic welcome message
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      const welcomeText = language === 'hi'
        ? 'नमस्ते! मैं आपका एआई मेडिकल रिपोर्ट सहायक हूँ। मैं आपकी रिपोर्ट के परिणामों को सरल भाषा में समझाने और डॉक्टर से पूछने योग्य सवाल तैयार करने में मदद कर सकता हूँ। आप माइक दबाकर बोल सकते हैं या नीचे लिखकर सवाल पूछ सकते हैं।'
        : (language === 'hinglish'
          ? 'Hello! Main aapka AI medical report assistant hoon. Main aapki report ke results ko simple language mein samjha sakta hoon aur doctor se discuss karne ke liye questions prepare karne mein help kar sakta hoon. Aap mic tap karke bol sakte hain ya type kar sakte hain.'
          : 'Hello! I am your AI clinical report assistant. I can help explain your medical results, clarify findings, and prepare questions for your doctor. You can speak using the microphone or type below.');

      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          role: 'assistant',
          content: welcomeText
        }
      ]);
    }
  }, [conversationId, language]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(conversationId);
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || text.trim().length === 0 || isLoading) return;

    const userMessageText = text.trim();
    setInputText('');

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      role: 'user',
      content: userMessageText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(
        conversationId,
        reportId,
        userMessageText,
        language,
        simpleMode
      );

      const assistantMsg = {
        id: response.message_id || `asst-${Date.now()}`,
        sender: 'assistant',
        role: 'assistant',
        content: response.content || response.response,
        structured_data: response.structured_data || {},
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);

      if (response.structured_data?.audio_playback) {
        handleSpeakBubble(assistantMsg.content, messages.length + 1);
      }
    } catch (err) {
      setIsLoading(false);
      const errorMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        role: 'assistant',
        content: 'I encountered an error connecting to the medical assistant service. Please verify your connection or try again.',
        isError: true,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleSpeakBubble = (text, idx) => {
    try {
      if (currentlySpeakingIdx === idx) {
        speechService?.stopSpeaking?.();
        setCurrentlySpeakingIdx(null);
        return;
      }

      if (!speechService?.isSynthesisSupported || !speechService.isSynthesisSupported()) {
        console.warn('Speech synthesis is not supported in this browser environment.');
        return;
      }

      setCurrentlySpeakingIdx(idx);
      speechService.speak(text, {
        language,
        onEnd: () => setCurrentlySpeakingIdx(null),
        onError: () => setCurrentlySpeakingIdx(null)
      });
    } catch (e) {
      console.warn('Speech playback prevented by browser restriction:', e);
      setCurrentlySpeakingIdx(null);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Generate dynamic questions based on uploaded report
  const getDynamicSuggestedQuestions = () => {
    if (!reportResult) {
      const langQuestions = SUGGESTED_QUESTIONS[language] || SUGGESTED_QUESTIONS.en;
      return simpleMode ? langQuestions.simple : langQuestions.standard;
    }

    const cat = reportResult.document_category;
    if (cat === 'CARDIOLOGY_ANGIOGRAM') {
      return [
        'What does 90% stenosis in my RCA mean?',
        'Explain my heart blood flow results in simple language.',
        'What questions should I ask my cardiologist?'
      ];
    }
    if (cat === 'CARDIOLOGY_ECG') {
      return [
        'What does my heart rate and rhythm indicate?',
        'Are my PR and QTc intervals normal?',
        'Can you summarize this ECG simply?'
      ];
    }
    if (cat === 'RADIOLOGY') {
      return [
        'What does the radiological impression mean?',
        'Were any abnormal lesions or findings observed?',
        'What should I discuss with my referring physician?'
      ];
    }

    // Default Lab Questions
    const abns = reportResult.abnormal_findings || [];
    if (abns.length > 0) {
      const firstAbn = abns[0].parameter;
      return [
        `What does my ${firstAbn} result mean?`,
        'Which findings are outside the reference range?',
        'Explain my abnormal values in simple words.',
        'What should I ask my doctor?'
      ];
    }

    return [
      'Can you summarize this report for me?',
      'Are all my findings within normal reference limits?',
      'What should I discuss with my doctor?'
    ];
  };

  return (
    <div className="chat-window-card">
      {/* Chat Header */}
      <div style={{
        padding: '0.9rem 1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card-elevated)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: 'rgba(168, 85, 247, 0.15)', color: 'var(--purple-ai)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-bright)', lineHeight: 1.2 }}>
              Interactive Medical Assistant
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
              Report-Grounded Agentic RAG
            </span>
          </div>
        </div>

        {/* Simple Mode Toggle */}
        <button
          onClick={onToggleSimpleMode}
          className={`top-btn-pill ${simpleMode ? 'active' : ''}`}
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
          title="Toggle Simplified Explanations with Layperson Terminology"
        >
          <Sparkles size={13} />
          <span>Simple Mode: {simpleMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Voice Assistant Panel & Waveform Control */}
      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(11, 17, 29, 0.5)' }}>
        <VoiceAssistantPanel
          language={language}
          onLanguageChange={onLanguageChange}
          simpleMode={simpleMode}
          onToggleSimpleMode={onToggleSimpleMode}
          reportResult={reportResult}
          onSpeechQuery={(query) => handleSend(query, true)}
        />
      </div>

      {/* Chat Messages Log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg, idx) => {
          const isUser = msg.sender === 'user' || msg.role === 'user';
          const isSpeaking = currentlySpeakingIdx === idx;

          return (
            <div key={msg.id || idx} className={`chat-bubble-container ${isUser ? 'user' : ''}`}>
              {!isUser && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.15)',
                  color: 'var(--purple-ai)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Bot size={16} />
                </div>
              )}

              <div className={`chat-bubble-dark ${isUser ? 'user' : 'assistant'}`}>
                {/* Assistant Controls: Play, Repeat, Copy, Sources */}
                {!isUser && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--purple-ai)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Clinical Assistant
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleSpeakBubble(msg.content, idx)}
                        className="chat-action-btn"
                        title={isSpeaking ? 'Stop Reading' : 'Play Response'}
                      >
                        <Volume2 size={12} color={isSpeaking ? 'var(--purple-ai)' : 'inherit'} />
                        <span>{isSpeaking ? 'Stop' : 'Play'}</span>
                      </button>
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className="chat-action-btn"
                        title="Copy message"
                      >
                        {copiedIndex === idx ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                        <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>

                {/* RAG Sources Link */}
                {!isUser && msg.structured_data?.sources && msg.structured_data.sources.length > 0 && (
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <BookOpen size={12} />
                      <span>RAG Sources Used:</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {msg.structured_data.sources.map((s, sIdx) => (
                        <a
                          key={sIdx}
                          href={s.url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '0.7rem', color: '#38bdf8', background: 'var(--bg-card)',
                            padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border-subtle)',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}
                        >
                          <span>{s.organization || s.title}</span>
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(6, 182, 212, 0.2)',
                  color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <User size={16} />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="chat-bubble-container">
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.15)',
              color: 'var(--purple-ai)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bot size={16} />
            </div>
            <div className="chat-bubble-dark assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing report & retrieving verified clinical evidence...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pill Row */}
      <div style={{
        padding: '0.6rem 1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-card-elevated)',
        display: 'flex',
        gap: '0.45rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {getDynamicSuggestedQuestions().map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={isLoading}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Text Input Row */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)',
          display: 'flex',
          gap: '0.6rem'
        }}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={strings.tapToSpeak || 'Ask a clinical question about your report...'}
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'var(--bg-card-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 1rem',
            fontSize: '0.88rem',
            color: 'var(--text-bright)',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="btn-upload-prominent"
          style={{ padding: '0.65rem 1.25rem' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
