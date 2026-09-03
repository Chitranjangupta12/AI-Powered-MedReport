/**
 * Multilingual & Elderly Language Configuration
 * Supports English, Hindi, and Hinglish with modular expansion for additional Indian languages.
 */

export const SUPPORTED_LANGUAGES = [
  { id: 'en', label: 'English', nativeLabel: 'English', recognitionLang: 'en-US' },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी (Hindi)', recognitionLang: 'hi-IN' },
  { id: 'hinglish', label: 'Hinglish', nativeLabel: 'Hinglish (हिंदी + Eng)', recognitionLang: 'en-IN' }
];

export const SUGGESTED_QUESTIONS = {
  en: {
    standard: [
      'What does my report mean?',
      'Which values are abnormal?',
      'Is anything concerning in this report?',
      'Explain this value in simple language.',
      'What should I discuss with my doctor?'
    ],
    simple: [
      'Are my test results normal?',
      'What does my report mean?',
      'Which values need attention?',
      'Can you read my report for me?',
      'Should I talk to my doctor?'
    ]
  },
  hi: {
    standard: [
      'मेरी रिपोर्ट का क्या मतलब है?',
      'कौन से टेस्ट सामान्य सीमा से बाहर हैं?',
      'क्या इस रिपोर्ट में कोई चिंताजनक बात है?',
      'सरल भाषा में इसका मतलब समझाएं।',
      'मुझे अपने डॉक्टर से क्या पूछना चाहिए?'
    ],
    simple: [
      'क्या मेरी रिपोर्ट नॉर्मल है?',
      'क्या कोई टेस्ट खराब आया है?',
      'मुझे डॉक्टर से क्या पूछना चाहिए?',
      'मेरी रिपोर्ट बोलकर सुनाएं।',
      'सरल शब्दों में समझाएं।'
    ]
  },
  hinglish: {
    standard: [
      'Meri report ka matlab kya hai?',
      'Kaunsi values abnormal hain?',
      'Kya is report mein koi concern hai?',
      'Simple language mein explain karein.',
      'Doctor se kya poochna chahiye?'
    ],
    simple: [
      'Kya meri report normal hai?',
      'Kaunsa test abnormal hai?',
      'Doctor se kya discuss karna chahiye?',
      'Report padhkar sunayein.',
      'Aasan shabdon mein samjhao.'
    ]
  }
};

export const UI_STRINGS = {
  en: {
    voiceAssistant: 'Voice Assistant',
    tapToSpeak: 'Tap to speak',
    listening: 'Listening... Speak now',
    processing: 'Understanding your question...',
    errorMic: 'Could not understand. Please tap and try again.',
    readReport: 'Read Report Aloud',
    readingReport: 'Reading report aloud...',
    repeat: 'Repeat',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    speed: 'Speed',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    simpleMode: 'Simple Explanation Mode',
    simpleModeActive: 'Simple Mode Active',
    elderView: 'Elder-Friendly View',
    disclaimer: 'Educational Clinical Assistant: This system explains laboratory terminology and ranges. It is not an autonomous doctor, does not prescribe treatments, and does not provide formal medical diagnoses.'
  },
  hi: {
    voiceAssistant: 'वॉइस असिस्टेंट (बोलकर पूछें)',
    tapToSpeak: 'माइक दबाकर सवाल पूछें',
    listening: 'सुन रहे हैं... अब बोलिए',
    processing: 'आपके सवाल को समझ रहे हैं...',
    errorMic: 'समझ नहीं पाए। कृपया माइक दबाकर पुनः बोलें।',
    readReport: 'रिपोर्ट बोलकर सुनाएं',
    readingReport: 'रिपोर्ट पढ़कर सुनाई जा रही है...',
    repeat: 'दोबारा सुनें',
    pause: 'रोकें',
    resume: 'जारी रखें',
    stop: 'बंद करें',
    speed: 'गति',
    slow: 'धीमी',
    normal: 'सामान्य',
    fast: 'तेज',
    simpleMode: 'सरल भाषा मोड',
    simpleModeActive: 'सरल मोड चालू है',
    elderView: 'वरिष्ठ नागरिक दृश्य (बड़ा फॉन्ट)',
    disclaimer: 'शैक्षणिक चिकित्सा सहायक: यह प्रणाली लैब रिपोर्ट समझने में सहायता करती है। यह डॉक्टर का विकल्प नहीं है, दवा नहीं लिखती और कोई निश्चित निदान नहीं देती।'
  },
  hinglish: {
    voiceAssistant: 'Voice Assistant (Bolkar Poochein)',
    tapToSpeak: 'Mic dabakar sawal poochein',
    listening: 'Sun rahe hain... Ab boliye',
    processing: 'Aapka sawal samajh rahe hain...',
    errorMic: 'Samajh nahi aaya. Please dobara boliye.',
    readReport: 'Report Bolkar Sunayein',
    readingReport: 'Report padhkar sunayi ja rahi hai...',
    repeat: 'Repeat Karein',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    speed: 'Speed',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    simpleMode: 'Simple Language Mode',
    simpleModeActive: 'Simple Mode Active',
    elderView: 'Elder-Friendly View',
    disclaimer: 'Educational Assistant: Yeh system report samajhne ke liye hai. Yeh doctor ka replacement nahi hai aur na hi medicines prescribe karta hai.'
  }
};

/**
 * Generates concise client-side summary script for reading report aloud
 */
export function generateClientSpokenSummary(reportResult, language = 'en') {
  if (!reportResult) {
    if (language === 'hi') return 'फिलहाल कोई मेडिकल रिपोर्ट चुनी नहीं गई है। कृपया पहले अपनी रिपोर्ट अपलोड करें।';
    if (language === 'hinglish') return 'Abhi koi report select nahi hai. Please pehle report upload karein.';
    return 'No medical report is currently selected. Please upload a report to listen.';
  }

  const reportType = reportResult.report_type || 'Laboratory Report';
  const abns = reportResult.abnormal_findings || [];
  const norms = reportResult.normal_findings || [];
  const isNormal = abns.length === 0;

  if (language === 'hi') {
    if (isNormal) {
      return `आपकी ${reportType} सामान्य है। सभी ${norms.length} टेस्ट सामान्य सीमा के भीतर हैं। रिपोर्ट में कोई असामान्य परिणाम नहीं है। व्यक्तिगत परामर्श के लिए डॉक्टर से चर्चा करें।`;
    }
    const names = abns.map(a => a.parameter).join(', ');
    return `आपकी ${reportType} में ${abns.length} टेस्ट सामान्य सीमा से बाहर हैं: ${names}। बाकी ${norms.length} टेस्ट सामान्य हैं। इन परिणामों पर अपने डॉक्टर से परामर्श अवश्य लें।`;
  }

  if (language === 'hinglish') {
    if (isNormal) {
      return `Aapki ${reportType} report completely normal hai. Sabhi ${norms.length} test normal range ke andar hain. Koi abnormal value nahi hai. Personal queries ke liye apne doctor se milein.`;
    }
    const names = abns.map(a => a.parameter).join(', ');
    return `Aapki ${reportType} report mein ${abns.length} abnormal values hain: ${names}। Baaki ${norms.length} test normal hain. Inhe apne doctor ke saath discuss karein.`;
  }

  // English
  if (isNormal) {
    return `Your ${reportType} is currently marked as routine or normal. All ${norms.length} analyzed markers are within laboratory reference ranges. There are no highlighted abnormal results in this report. For any personal medical concerns, discuss the report with your healthcare professional.`;
  }

  const names = abns.map(a => `${a.parameter} (${a.status})`).join(', ');
  return `Your ${reportType} has findings that should be reviewed. There are ${abns.length} values outside the normal laboratory range, including ${names}. There are also ${norms.length} normal findings. Please discuss these specific results with your healthcare professional.`;
}
