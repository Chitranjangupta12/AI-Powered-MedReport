import React, { useState, useEffect } from 'react';
import {
  Mic, MicOff, Volume2, Pause, Play, Square, RotateCcw,
  Sparkles, Check, AlertCircle, VolumeX, FastForward
} from 'lucide-react';
import { speechService } from '../services/speechService';
import {
  SUPPORTED_LANGUAGES, UI_STRINGS, generateClientSpokenSummary
} from '../utils/multilingual';

export default function VoiceAssistantPanel({
  language = 'en',
  onLanguageChange,
  simpleMode = true,
  onToggleSimpleMode,
  reportResult = null,
  onSpeechQuery
}) {
  const [micState, setMicState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'error'
  const [micErrorMessage, setMicErrorMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState('slow'); // 'slow' | 'normal' | 'fast'
  const [voiceStatus, setVoiceStatus] = useState({ available: true, label: '' });
  const isSpeechSupported = speechService?.isSupported ? speechService.isSupported() : false;
  const isRecognitionSupported = speechService?.isRecognitionSupported ? speechService.isRecognitionSupported() : false;
  const isSynthesisSupported = speechService?.isSynthesisSupported ? speechService.isSynthesisSupported() : false;

  const strings = UI_STRINGS[language] || UI_STRINGS.en;

  useEffect(() => {
    try {
      const status = speechService?.getVoiceStatus ? speechService.getVoiceStatus(language) : { available: false, label: 'Voice features are unavailable in this browser.' };
      setVoiceStatus(status);
    } catch (e) {
      setVoiceStatus({ available: false, label: 'Voice features are unavailable in this browser.' });
    }
  }, [language]);

  const handleSpeedChange = (speed) => {
    setSpeechSpeed(speed);
    if (speed === 'slow') speechService.setRate(0.85);
    else if (speed === 'normal') speechService.setRate(1.0);
    else if (speed === 'fast') speechService.setRate(1.2);
  };

  const handleToggleMic = () => {
    if (micState === 'listening') {
      speechService.stopListening();
      setMicState('idle');
      return;
    }

    setMicErrorMessage('');
    setMicState('listening');

    const started = speechService.startListening({
      language,
      onResult: (recognizedText) => {
        setMicState('processing');
        if (onSpeechQuery) {
          onSpeechQuery(recognizedText);
        }
        setTimeout(() => setMicState('idle'), 1200);
      },
      onError: (err) => {
        setMicState('error');
        setMicErrorMessage(err.error === 'not-allowed' ? 'Microphone permission blocked.' : strings.errorMic);
        setTimeout(() => setMicState('idle'), 3500);
      }
    });

    if (!started) {
      setMicState('error');
      setMicErrorMessage('Speech recognition is not supported in this browser.');
      setTimeout(() => setMicState('idle'), 3500);
    }
  };

  const handleReadReportAloud = () => {
    try {
      if (isSpeaking) {
        if (isPaused) {
          speechService?.resumeSpeaking?.();
          setIsPaused(false);
        } else {
          speechService?.pauseSpeaking?.();
          setIsPaused(true);
        }
        return;
      }

      if (!speechService?.isSynthesisSupported || !speechService.isSynthesisSupported()) {
        setMicErrorMessage('Voice readout is not supported in this browser.');
        setTimeout(() => setMicErrorMessage(''), 3500);
        return;
      }

      const scriptText = reportResult?.spoken_summary || generateClientSpokenSummary(reportResult, language);

      setIsSpeaking(true);
      setIsPaused(false);

      const success = speechService.speak(scriptText, {
        language,
        onEnd: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        },
        onError: () => {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      });

      if (!success) {
        setIsSpeaking(false);
        setIsPaused(false);
      }
    } catch (e) {
      console.warn('Speech synthesis prevented:', e);
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const handleStopReading = () => {
    try {
      speechService?.stopSpeaking?.();
    } catch (e) {}
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* Mic CTA with Audio Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={handleToggleMic}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: micState === 'listening' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: micState === 'listening' ? '0 0 16px rgba(239, 68, 68, 0.5)' : '0 0 16px rgba(168, 85, 247, 0.35)',
              cursor: 'pointer',
              position: 'relative'
            }}
            title={micState === 'listening' ? 'Tap to Stop Listening' : 'Tap to Speak Your Question'}
          >
            {micState === 'listening' ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: isRecognitionSupported ? 'var(--text-bright)' : 'var(--text-dim)' }}>
                {micState === 'listening' ? 'Listening...' : (micState === 'processing' ? 'Processing...' : (isRecognitionSupported ? '🎙 Tap to Speak' : 'Voice Input Disabled'))}
              </span>
              {micState === 'listening' && (
                <div className="audio-waveform-bars">
                  <div className="audio-waveform-bar" />
                  <div className="audio-waveform-bar" />
                  <div className="audio-waveform-bar" />
                  <div className="audio-waveform-bar" />
                  <div className="audio-waveform-bar" />
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: isRecognitionSupported ? 'var(--text-muted)' : '#f59e0b' }}>
              {isRecognitionSupported ? 'Ask in English, हिन्दी, or Hinglish' : 'Voice features are unavailable in this browser.'}
            </span>
          </div>
        </div>

        {/* Read Report Aloud Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={handleReadReportAloud}
            className="top-btn-pill"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.78rem',
              borderColor: isSpeaking ? 'var(--purple-ai)' : 'var(--border-subtle)',
              color: isSpeaking ? 'var(--purple-ai)' : 'var(--text-main)'
            }}
            title="Read Concise Summary of Current Report Aloud"
          >
            {isSpeaking ? (isPaused ? <Play size={13} /> : <Pause size={13} />) : <Volume2 size={13} />}
            <span>{isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Read Report Aloud'}</span>
          </button>

          {isSpeaking && (
            <button
              onClick={handleStopReading}
              className="top-btn-pill"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: '#f87171' }}
              title="Stop Reading"
            >
              <Square size={12} />
            </button>
          )}

          {/* Speed Selector */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
            <button
              onClick={() => handleSpeedChange('slow')}
              style={{
                padding: '0.2rem 0.45rem', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px',
                background: speechSpeed === 'slow' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: speechSpeed === 'slow' ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              Slow
            </button>
            <button
              onClick={() => handleSpeedChange('normal')}
              style={{
                padding: '0.2rem 0.45rem', fontSize: '0.7rem', fontWeight: 600, borderRadius: '4px',
                background: speechSpeed === 'normal' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: speechSpeed === 'normal' ? 'var(--primary)' : 'var(--text-muted)'
              }}
            >
              Normal
            </button>
          </div>
        </div>
      </div>

      {micErrorMessage && (
        <div style={{ fontSize: '0.76rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <AlertCircle size={13} />
          <span>{micErrorMessage}</span>
        </div>
      )}
    </div>
  );
}
