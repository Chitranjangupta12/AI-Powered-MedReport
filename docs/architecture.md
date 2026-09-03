# System Architecture & Multi-Tool Agent Orchestration

## 1. Executive Summary
The **Agentic AI Medical Report Understanding & Patient Guidance System** bridges the critical communication gap between clinical laboratory diagnostic output and patient comprehension. It transforms dense, cryptic laboratory reports into actionable, supportive, plain-language guidance while preserving absolute clinical safety boundaries.

---

## 2. End-to-End System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │           Patient / User Client         │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │       React.js Frontend Dashboard       │
                               │  - Drag & Drop Upload (PDF / PNG / JPG) │
                               │  - Urgency Badge (GREEN / YELLOW / RED) │
                               │  - Interactive Analyte Table            │
                               │  - Conversational Memory Chatbot        │
                               │  - Empirical Research Benchmark View    │
                               └────────────────────┬────────────────────┘
                                                    │ REST API
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │       Node.js / Express Backend         │
                               │  - Multer File Integrity Validation     │
                               │  - Security & PII Redaction Middleware  │
                               │  - Emergency Symptom Interceptor        │
                               │  - Prescription Refusal Guardrail       │
                               │  - Resilient Database & Vector Handler  │
                               └───────────┬─────────────────┬───────────┘
                                           │                 │
                  External Orchestration   │                 │ Local Fallback
                                           ▼                 ▼
          ┌──────────────────────────────────┐     ┌──────────────────────────────────┐
          │      n8n AI Agent Workflow       │     │   Embedded Agentic Coordinator   │
          │  (/webhook/medical-report-agent) │     │      (agentService.js Engine)    │
          └────────────────┬─────────────────┘     └────────────────┬─────────────────┘
                           │                                        │
                           └───────────────────┬────────────────────┘
                                               │
                                               ▼
         ┌────────────────────────────────────────────────────────────────────────┐
         │                          Agentic Tool Suite                            │
         │                                                                        │
         │  1. Document / OCR Tool: pdf-parse & Tesseract.js image recognition     │
         │  2. Report Extraction Tool: Regex & heuristic analyte parsing          │
         │  3. Lab Reference Range Analyzer: Report-specific interval comparison   │
         │  4. Medical RAG Tool: Traceable retrieval from NIH / CDC / WHO         │
         │  5. Risk Assessment Tool: Triage into GREEN, YELLOW, or RED categories │
         │  6. Conversation Memory Tool: Contextual anchoring across chat turns   │
         └─────────────────────────────────────┬──────────────────────────────────┘
                                               │
                                               ▼
                               ┌────────────────────────────────┐
                               │ PostgreSQL + pgvector Database │
                               │  - users, reports, results     │
                               │  - conversations, messages     │
                               │  - rag_documents, rag_chunks   │
                               │  - evaluation_runs             │
                               └────────────────────────────────┘
```

---

## 3. The 6 Core Agent Tools

### Tool 1: Document / OCR Extractor
- Accepts digital PDF streams or raster images (PNG, JPG, JPEG).
- Digital PDFs are extracted via `pdf-parse`.
- Scanned documents or images are transcribed using `tesseract.js` optical character recognition.

### Tool 2: Report Extraction Tool
- Deconstructs raw text into structured laboratory analyte objects:
  - `parameter`: Official analyte name (e.g., Hemoglobin, Fasting Blood Glucose, ALT)
  - `result_value`: Extracted numerical or qualitative measure
  - `unit`: Measurement unit (e.g., g/dL, mg/dL, U/L, %)
  - `reference_range`: Laboratory-specific reference interval printed on the document
  - `flag`: Explicit flag marked by the testing lab (e.g., HIGH, LOW, NORMAL)

### Tool 3: Lab Reference Range Analyzer
- **Fundamental Clinical Invariant**: Never applies generic universal reference ranges when the patient's report specifies a laboratory-calibrated reference interval.
- Mathematical bounds-testing checks values against the lab's lower and upper bounds.
- Categorizes parameters into: `Normal`, `Low`, `High`, `Critical Low`, `Critical High`, `Abnormal`, or `Unknown`.

### Tool 4: Medical RAG (Retrieval-Augmented Generation) Tool
- Semantic retrieval over authoritative clinical repositories (National Institutes of Health MedlinePlus, Centers for Disease Control and Prevention, American Heart Association, American Diabetes Association).
- Returns verifiable citations with organization name and source URL.

### Tool 5: Risk Assessment Tool
- Triages findings into 3 standardized informational urgency categories:
  - **GREEN (Informational)**: All values within normal reference intervals; focuses on wellness maintenance.
  - **YELLOW (Routine / Consultation)**: Deviations present; recommends discussion during next healthcare visit.
  - **RED (Prompt Evaluation)**: Critical panic values or marked multi-fold elevations; strongly recommends prompt professional evaluation.

### Tool 6: Conversation Memory Tool
- Anchors follow-up questions to the extracted parameters of the report.
- Enables natural conversational follow-ups such as *"What did you say about my hemoglobin?"* or *"Could dehydration cause my high creatinine?"*.

---

## 4. Dual-Engine Orchestration Design
To ensure resilience in production and standalone developer velocity, the backend implements a **Dual-Engine architecture**:
1. **n8n Orchestrator Mode**: When n8n is running at `N8N_WEBHOOK_URL`, the backend dispatches payloads to n8n's visual workflow for agent execution.
2. **Local Autonomous Fallback**: If n8n is offline or unreachable, the Express backend automatically executes its built-in tool coordinator (`agentService.js`), guaranteeing 100% uptime and schema compatibility.
