# Medical Report Understanding - React Frontend

## 1. Overview
A modern, responsive React interface designed to empower patients to understand complex medical reports without diagnostic ambiguity or medical jargon confusion.

## 2. Features
- **Dashboard**:
  - Drag-and-drop report uploader supporting PDF, PNG, JPG, and JPEG.
  - Client-side validation: format checking, 15 MB size limit, empty file prevention.
  - One-click synthetic demo reports (CBC with Anemia, Lipid Panel, Acute Liver Alert).
  - Previous reports drawer with deletion functionality.
- **Report Summary View**:
  - Clinical urgency badges: **GREEN** (Routine/Normal), **YELLOW** (Review Recommended), **RED** (Prompt Evaluation).
  - Important clinical highlights and potential physiological context.
  - Actionable questions tailored for discussion with a doctor.
  - Authoritative reference source links (NIH MedlinePlus, CDC, AHA).
  - Prominent non-diagnostic clinical limitations disclaimer.
- **Laboratory Analyte Breakdown**:
  - Interactive table of extracted test analytes, values, units, and laboratory reference intervals.
  - Filter by All, Normal, or Abnormal parameters.
  - Expandable row explaining each marker in plain language.
- **Conversational Medical Chatbot**:
  - Report-anchored conversation memory (e.g., "What did you say about my hemoglobin?").
  - Emergency symptom detection with immediate 911 / hospital emergency alert banners.
  - Prescription medication alteration refusal banners.
  - Quick-prompt question chips.
- **Research Evaluation Dashboard**:
  - Live empirical benchmark view comparing System A (Zero-shot LLM), System B (LLM + RAG), and System C (Agentic AI + Tools).

## 3. Running Frontend
```bash
# Install dependencies
npm install --ignore-scripts

# Start development server
npm run dev
```
Runs at: `http://localhost:5173`
