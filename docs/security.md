# Security, Privacy & HIPAA-Aligned Governance

## 1. Core Principles
Health data is exceptionally sensitive. The system is architected around the following foundational security tenets:
1. **Zero Exposure of Third-Party API Keys**: Keys and credentials reside strictly on the server side via environment variables (`.env`). The client application receives no private credentials.
2. **De-Identification & Automated PII Redaction**: Before document text or user inquiries are processed by reasoning modules, sensitive identifiers (Social Security Numbers, full phone numbers, email addresses) are masked.
3. **Right to Be Forgotten**: Invoking `DELETE /api/reports/:id` deletes database records and permanently unlinks physical file assets from server storage.
4. **Non-Diagnostic Invariance**: System prompts and output filters enforce non-diagnostic boundaries to prevent clinical liability.
5. **Prescription Invariance**: The AI is strictly barred from prescribing drugs, titrating dosages, or advising pharmaceutical discontinuation.

---

## 2. Emergency Symptom Escalation Protocol
If user input contains red-flag emergency symptoms:
- Chest pain or severe pressure
- Shortness of breath or respiratory distress
- Sudden numbness or facial drooping (stroke indicators)
- Severe uncontrolled bleeding
- Loss of consciousness

The system bypasses conversational banter, classifies the query as **RED**, and returns immediate guidance to dial local emergency services (911 / 112 / 999) or visit the nearest emergency department.

---

## 3. Threat Model & Mitigations
| Threat Vector | Potential Impact | Implemented Mitigation |
|---|---|---|
| **Malicious File Upload** | Remote code execution or server compromise | Strict MIME verification, extension whitelisting (`.pdf`, `.png`, `.jpg`), file size capping (15 MB), and safe sandboxed pure-JS parsers. |
| **Data Leakage via Git** | Accidental credential or PHI commit | Robust `.gitignore` guarding `.env`, certificates, and `uploads/`. Strict use of synthetic data only during testing. |
| **Hallucinatory Medical Advice** | Patient harm from unverified medical claims | Tool boundary checking against lab reference ranges + grounding against verified NIH/CDC clinical repositories. |
| **Prompt Injection** | Overriding safety guardrails | System prompt sandwiching, schema validation, and hardcoded pre-response safety interceptors. |
