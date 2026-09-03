/**
 * Clinical Safety, Emergency Escalation, and Privacy Redaction Middleware
 * Multilingual support for English, Hindi, and Hinglish.
 */

const EMERGENCY_SYMPTOMS = [
  'chest pain', 'severe chest pressure', 'shortness of breath', 'can\'t breathe',
  'difficulty breathing', 'sudden weakness', 'facial drooping', 'slurred speech',
  'loss of consciousness', 'passed out', 'coughing blood', 'severe uncontrolled bleeding',
  'suicidal', 'severe allergic reaction', 'anaphylaxis',
  // Hindi & Hinglish emergency symptoms
  'seene mein dard', 'seene me dard', 'chhati me dard', 'chhati mein dard',
  'saans lene me takleef', 'saans lene mein dikkat', 'saans phool',
  'behosh', 'chakkar aake behosh', 'khoon ki ulti'
];

const PRESCRIPTION_REQUEST_PATTERNS = [
  /should i (start|stop|increase|decrease|change|take)\s+(my\s+)?(medication|dose|pills|medicine|drugs|prescription)/i,
  /can you prescribe/i,
  /what dose of\s+[\w\s]+\s+should i take/i,
  /prescribe me/i,
  // Hindi & Hinglish patterns
  /(kya mujhe|kya me|kya mai|mujhe)\s+.*(dawa|dawai|tablet|dose|medicine).*(chalu|shuru|band|badha|kam|leni|lena)/i,
  /(dawa|dawai|medicine|tablet).*(prescribe|likh|de do)/i,
  /prescribe.*(dawa|dawai|medicine)/i,
  /kaunsi\s+(dawa|dawai|medicine)\s+lu/i
];

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g // Phone
];

function redactPii(text) {
  if (!text || typeof text !== 'string') return text;
  let redacted = text;
  PII_PATTERNS.forEach(pat => {
    redacted = redacted.replace(pat, '[REDACTED_PII]');
  });
  return redacted;
}

function checkEmergencySymptoms(message) {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase();
  return EMERGENCY_SYMPTOMS.some(symptom => lower.includes(symptom));
}

function checkPrescriptionRequest(message) {
  if (!message || typeof message !== 'string') return false;
  return PRESCRIPTION_REQUEST_PATTERNS.some(pat => pat.test(message));
}

function getEmergencyResponse(lang = 'en') {
  const isHindi = lang === 'hi';
  const isHinglish = lang === 'hinglish';

  if (isHindi) {
    return {
      summary: "आपातकालीन स्वास्थ्य चेतावनी: संभावित गंभीर लक्षण।",
      content: "आपने ऐसे लक्षण (जैसे सीने में गंभीर दर्द, सांस लेने में तकलीफ या बेहोशी) बताए हैं जो किसी आपातकालीन चिकित्सा स्थिति का संकेत हो सकते हैं। कृपया किसी एआई चैटबॉट पर निर्भर न रहें। तुरंत आपातकालीन चिकित्सा सेवा (112 / 108) से संपर्क करें या निकटतम अस्पताल के इमरजेंसी वार्ड में जाएं।",
      urgency: "prompt_evaluation",
      urgency_category: "RED",
      is_emergency: true
    };
  }

  if (isHinglish) {
    return {
      summary: "CRITICAL HEALTH ALERT: Emergency symptoms detected.",
      content: "Aapne serious symptoms (jaise seene mein dard, saans lene mein takleef ya sudden weakness) bataye hain jo immediate medical emergency ho sakte hain. AI chatbot par rely na karein. Turant apne nearest hospital ke emergency room mein jayein ya emergency ambulance service ko call karein.",
      urgency: "prompt_evaluation",
      urgency_category: "RED",
      is_emergency: true
    };
  }

  return {
    summary: "CRITICAL HEALTH ALERT: Potential Emergency Symptoms Detected.",
    content: "You have mentioned symptoms (such as severe chest pain, shortness of breath, sudden weakness, or acute distress) that may indicate an immediate medical emergency. Do not rely on an AI chatbot. Please immediately call your local emergency services (e.g., 911 in the US/Canada, 112 in Europe/India, 999 in the UK) or go to the nearest hospital emergency room.",
    urgency: "prompt_evaluation",
    urgency_category: "RED",
    is_emergency: true
  };
}

function getPrescriptionRefusalResponse(lang = 'en') {
  const isHindi = lang === 'hi';
  const isHinglish = lang === 'hinglish';

  if (isHindi) {
    return {
      summary: "दवा नीति सूचना: दवा लिखना या बदलना प्रतिबंधित है।",
      content: "एक मेडिकल रिपोर्ट सहायक के रूप में, मैं कोई भी दवा लिखने, खुराक बदलने या दवा बंद करने की सलाह नहीं दे सकता। किसी भी दवा में बदलाव के लिए कृपया अपने डॉक्टर या स्वास्थ्य विशेषज्ञ से परामर्श लें।",
      urgency: "routine",
      urgency_category: "YELLOW",
      is_prescription_query: true
    };
  }

  if (isHinglish) {
    return {
      summary: "Medication Policy Notice: Prescription Guidance Prohibited.",
      content: "Ek educational report assistant ke roop mein, main koi bhi prescription medication recommend ya dose change nahi kar sakta. Kisi bhi medicine ko shuru ya band karne se pehle apne prescribing doctor se zaroor salah lein.",
      urgency: "routine",
      urgency_category: "YELLOW",
      is_prescription_query: true
    };
  }

  return {
    summary: "Medication Policy Notice: Prescription Guidance Prohibited.",
    content: "As an educational AI report-understanding assistant, I am strictly programmed never to prescribe medications, alter dosages, or advise stopping or starting any prescription drug. Any changes to your medication regimen must be directly evaluated and authorized by your prescribing physician or healthcare professional.",
    urgency: "routine",
    urgency_category: "YELLOW",
    is_prescription_query: true
  };
}

// Default English responses for backward compatibility with existing tests
const EMERGENCY_RESPONSE = getEmergencyResponse('en');
const PRESCRIPTION_REFUSAL_RESPONSE = getPrescriptionRefusalResponse('en');

module.exports = {
  redactPii,
  checkEmergencySymptoms,
  checkPrescriptionRequest,
  getEmergencyResponse,
  getPrescriptionRefusalResponse,
  EMERGENCY_RESPONSE,
  PRESCRIPTION_REFUSAL_RESPONSE
};
