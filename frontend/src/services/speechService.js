/**
 * Speech Recognition (STT) and Speech Synthesis (TTS) Service
 * Utilizes native browser Web Speech API with graceful fallback and voice detection.
 */

class SpeechService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.currentUtterance = null;
    this.voices = [];
    this.voicesLoaded = false;
    this.speechRate = 0.85; // Default slow/comfortable for elderly users
    this.lastSpokenText = '';
    this.lastSpokenOptions = {};

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        this.initVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.initVoices();
        }
      }
    } catch (e) {
      console.warn('SpeechService initialization warning:', e);
    }
  }

  initVoices() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        this.voices = window.speechSynthesis.getVoices() || [];
        if (this.voices.length > 0) {
          this.voicesLoaded = true;
        }
      }
    } catch (e) {
      this.voices = [];
    }
  }

  /**
   * Check if any speech functionality (recognition OR synthesis) is supported by the browser
   */
  isSupported() {
    return this.isRecognitionSupported() || this.isSynthesisSupported();
  }

  isRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    try {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    } catch (e) {
      return false;
    }
  }

  isSynthesisSupported() {
    if (typeof window === 'undefined') return false;
    try {
      return 'speechSynthesis' in window && !!window.speechSynthesis;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check voice availability for a given language code (e.g., 'hi', 'en')
   */
  getVoiceStatus(language = 'en') {
    if (!this.isSynthesisSupported()) return { available: false, label: 'Voice not supported by browser' };

    const langLower = language.toLowerCase();
    const hasHindi = this.voices.some(v => v.lang.startsWith('hi') || v.name.toLowerCase().includes('hindi'));

    if (langLower === 'hi') {
      return hasHindi
        ? { available: true, label: 'Hindi voice ready' }
        : { available: true, label: 'Using device default voice' };
    }

    if (langLower === 'hinglish') {
      const hasIndianEnglish = this.voices.some(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india'));
      return hasIndianEnglish || hasHindi
        ? { available: true, label: 'Indian voice ready' }
        : { available: true, label: 'Using device voice' };
    }

    return { available: true, label: 'Voice output ready' };
  }

  /**
   * Start microphone listening
   */
  startListening({ language = 'en', onResult, onError, onEnd }) {
    if (!this.isRecognitionSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari, or type your question below.');
      return false;
    }

    this.stopListening();
    this.stopSpeaking();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Map language to BCP 47 tag
    let langTag = 'en-US';
    if (language === 'hi') langTag = 'hi-IN';
    else if (language === 'hinglish') langTag = 'en-IN';

    this.recognition.lang = langTag;
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      this.isListening = false;
      const transcript = event.results[0][0].transcript;
      if (onResult) onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      let errorMsg = 'Could not recognize speech. Please try again.';
      if (event.error === 'not-allowed') {
        errorMsg = 'Microphone permission was denied. Please allow microphone access in browser settings to speak.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech was detected. Please tap the microphone and speak your question.';
      } else if (event.error === 'network') {
        errorMsg = 'Network issue during speech recognition. Please check your connection.';
      }
      if (onError) onError(errorMsg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
      return true;
    } catch (err) {
      this.isListening = false;
      if (onError) onError(`Microphone error: ${err.message}`);
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }

  /**
   * Set speaking rate (0.75 - 1.5)
   */
  setRate(rate) {
    this.speechRate = Math.max(0.6, Math.min(1.5, rate));
  }

  /**
   * Speak text aloud using SpeechSynthesis
   */
  speak(text, { language = 'en', onStart, onEnd, onError } = {}) {
    if (!this.isSynthesisSupported() || !text || text.trim().length === 0) return false;

    this.stopSpeaking();
    this.lastSpokenText = text;
    this.lastSpokenOptions = { language };

    // Remove markdown symbols (asterisks, hashes, links) for clean audio speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/•/g, '')
      .replace(/[—–]/g, ', ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.speechRate;
    utterance.pitch = 1.0;

    // Select optimal voice matching language
    const langLower = language.toLowerCase();
    let bestVoice = null;

    if (langLower === 'hi') {
      bestVoice = this.voices.find(v => v.lang.startsWith('hi') || v.lang === 'hi-IN' || v.name.toLowerCase().includes('hindi'));
    } else if (langLower === 'hinglish') {
      bestVoice = this.voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('india')) ||
        this.voices.find(v => v.lang.startsWith('hi'));
    }

    if (!bestVoice) {
      bestVoice = this.voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))) ||
        this.voices.find(v => v.lang.startsWith('en')) ||
        this.voices[0];
    }

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      this.currentUtterance = null;
      if (onError) onError(event);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  pause() {
    if (this.isSynthesisSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  resume() {
    if (this.isSynthesisSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  stopSpeaking() {
    if (this.isSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  repeat(callbacks = {}) {
    if (this.lastSpokenText) {
      this.speak(this.lastSpokenText, { ...this.lastSpokenOptions, ...callbacks });
    }
  }

  isSpeaking() {
    return this.isSynthesisSupported() && window.speechSynthesis.speaking && !window.speechSynthesis.paused;
  }

  isPaused() {
    return this.isSynthesisSupported() && window.speechSynthesis.paused;
  }
}

export const speechService = new SpeechService();
