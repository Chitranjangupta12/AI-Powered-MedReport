# Agentic AI Medical Report Understanding & Patient Guidance System

> **A Clinically-Principled, Multi-Tool Agentic AI Platform for Laboratory Report Understanding, RAG-Grounding, and Patient Guidance.**

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-27%20Passing-emerald.svg)](#11-testing)

---

## 1. Project Overview
Direct patient access to diagnostic laboratory results through electronic patient portals frequently induces health anxiety when individuals encounter unexplained abnormal flags, complex biochemical metrics, and unfamiliar medical jargon. 

The **Agentic AI Medical Report Understanding & Patient Guidance System** enables ordinary users to upload medical reports (PDF, JPG, PNG) and interact with an intelligent agentic assistant that:
- Extracts individual analyte values, units, and laboratory-calibrated reference intervals.
- Evaluates results strictly against the specific laboratory's printed reference range (avoiding generic population assumptions).
- Explains findings in compassionate, accessible, plain language.
- Classifies report urgency into standardized categories: **GREEN** (Normal/Routine), **YELLOW** (Consultation Recommended), and **RED** (Prompt Professional Evaluation).
- Cites authoritative evidence exclusively from recognized health bodies (**NIH MedlinePlus, CDC, WHO, AHA, ADA**).
- Prepares tailored questions for the patient to discuss with their healthcare professional.
- Upholds strict clinical safety guardrails: **never prescribes medications, never claims definitive diagnoses, and immediately escalates emergency symptoms**.

---

## 2. Key Features

### 🖥️ Clinical Dashboard & Visualization
- **Drag-and-Drop Uploader**: Accepts PDF, PNG, JPG, and JPEG with client and server-side file integrity validation (up to 15 MB).
- **One-Click Synthetic Demos**: Instant test presets (CBC Anemia, Lipid Profile, Acute Hepatic Alert) for immediate evaluation without external files.
- **Interactive Analyte Breakdown Table**: Filterable by All, Normal, or Abnormal parameters with click-to-explain tooltips for every test.
- **Urgency Stratification**: Clear badges (**GREEN**, **YELLOW**, **RED**) indicating follow-up urgency without diagnostic overreach.
- **Questions for Your Doctor**: Copyable, empowering questions tailored to the patient's specific lab flags.

### 🤖 Multi-Tool Agentic Layer (n8n & Embedded Coordinator)
1. **Document / OCR Extractor**: Fast digital PDF parsing (`pdf-parse`) and image optical character recognition (`tesseract.js`).
2. **Report Extraction Tool**: Structured parsing of analyte names, values, units, and ranges.
3. **Lab Reference Range Analyzer**: Mathematical bounds-tester strictly checking laboratory intervals.
4. **Medical RAG Tool**: Semantic retrieval over verified clinical guidelines.
5. **Risk Assessment Tool**: Standardized clinical triage classification.
6. **Conversation Memory**: Context-anchored chat memory enabling follow-ups like *"What did you say about my hemoglobin?"*.
7. **Voice & Multilingual Assistant**: Web Speech API integration (STT & TTS), English / Hindi / Hinglish translation & explanations, Simple Explanation Mode for elderly users, spoken summary readout, and accessible voice controls (Slow/Normal/Fast speed, Repeat, Pause, Resume, Stop).

### 🔬 Empirical Research Benchmark View
Built-in evaluation framework comparing:
- **System A (Zero-Shot Baseline LLM)**
- **System B (Knowledge-Augmented RAG)**
- **System C (Agentic AI + Multi-Tool Orchestration)**
Measuring Extraction $F_1$, Abnormal Sensitivity, Hallucination Suppression, Source Groundedness, and Safety Compliance.

---

## 3. Architecture

```
User / Patient
      │
      ▼
React.js Frontend (Vite)
      │  REST API
      ▼
Node.js / Express Backend
      │
      ├──────────────────────────────┬──────────────────────────────┐
      ▼                              ▼                              ▼
n8n Webhook / Orchestrator    Embedded Agentic Engine       PostgreSQL + pgvector
      │                              │                    (Reports, Chunks, Vector Store)
      ▼                              ▼
Agentic Tool Suite:
  1. Document / OCR Extractor (pdf-parse / Tesseract.js)
  2. Report Extraction Tool
  3. Lab Reference Range Analyzer (Bounds-tested against report intervals)
  4. Medical RAG Tool (NIH MedlinePlus, CDC, WHO)
  5. Risk Assessment Tool (GREEN, YELLOW, RED Triage)
  6. Conversation Memory Tool
      │
      ▼
Structured Clinical Output (structured_report_response.json)
      │
      ▼
React Patient UI
```

---

## 4. Technology Stack

- **Frontend**: React 18, Vite, Modern Responsive CSS, Lucide Icons, Axios.
- **Backend**: Node.js, Express.js, Multer, Helmet, Morgan, PDF-Parse, Tesseract.js, PDFKit, pg (node-postgres), UUID.
- **Automation & Orchestration**: n8n AI Agent Workflow (LangChain Agent Node + Tool Nodes).
- **Database & Vector Store**: PostgreSQL 16 with `pgvector` extension; resilient standalone in-memory fallback.
- **RAG & Knowledge Base**: Verified clinical reference documents from NIH MedlinePlus, CDC, WHO, AHA, ADA.
- **Testing & Research**: Mocha, Supertest, Flesch-Kincaid Readability, Empirical Evaluator Module.

---

## 5. Directory Structure

```
medical-report-ai/
├── frontend/                 # React.js SPA (Vite, CSS, Components)
│   ├── src/
│   │   ├── components/       # Navbar, ReportSummary, LabTable, Chatbot, Evaluation
│   │   ├── services/         # Axios API client
│   │   ├── App.jsx           # Main orchestrator
│   │   └── index.css         # Clinical styling
│   ├── package.json
│   └── README.md
│
├── backend/                  # Node.js / Express REST API
│   ├── src/
│   │   ├── config/           # Database & Environment
│   │   ├── controllers/      # Report, Chat, n8n, Evaluation controllers
│   │   ├── middleware/       # Upload, Safety Guardrails, Error Handling
│   │   ├── routes/           # REST endpoints
│   │   ├── services/         # OCR, Extractor, Analyzer, RAG, Agentic Coordinator
│   │   ├── utils/            # Logger, PDF Generator
│   │   └── server.js         # Entry point
│   ├── sample_reports/       # Generated synthetic PDF test cases
│   ├── tests/                # Unit & Integration test suite
│   ├── package.json
│   └── README.md
│
├── n8n/                      # Workflow automation
│   ├── workflows/            # medical_report_agent.json (Exportable n8n workflow)
│   ├── prompts/              # System & Tool prompt definitions
│   ├── schemas/              # JSON schemas for structured outputs
│   └── README.md
│
├── database/
│   ├── schema.sql            # PostgreSQL + pgvector DDL
│   └── seed.sql              # Authoritative clinical knowledge seeds
│
├── rag/
│   ├── documents/            # Verified guidelines (CBC, Lipid, LFT, KFT, Thyroid, Glucose, Urine)
│   ├── ingestion/            # ingest.js chunking & embedding pipeline
│   ├── knowledge_base_vectors.json
│   └── README.md
│
├── evaluation/               # Research benchmark module
│   ├── datasets/             # synthetic_reports.json (Annotated ground truth)
│   ├── metrics/              # evaluator.js (F1, Sensitivity, Readability)
│   ├── run_evaluation.js     # System A vs B vs C benchmark runner
│   └── README.md
│
├── docs/                     # Technical documentation
│   ├── architecture.md
│   ├── api.md
│   ├── security.md
│   └── research.md
│
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## 6. Installation & Quick Start

### Prerequisites
- Node.js v18+ (tested on v20 & v25)
- npm v9+
- Docker & Docker Compose *(optional for containerized setup)*

### 1. Clone & Setup Environment
```bash
git clone <repository_url>
cd medical-report-ai

# Copy environment template
cp .env.example .env
```

### 2. Backend Setup
```bash
cd backend
npm install --ignore-scripts

# Generate synthetic PDF sample reports for testing
npm run generate-samples

# Start backend server (runs on http://localhost:5000)
npm start
```

### 3. Frontend Setup (in a separate terminal)
```bash
cd frontend
npm install --ignore-scripts

# Start React development server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser to access the application.

---

## 7. Environment Variables Configuration

Refer to `.env.example` for all configurable variables:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/medical_ai_db
USE_POSTGRES=false

# LLM API (OpenAI / Anthropic / Google Gemini)
LLM_PROVIDER=openai
LLM_API_KEY=your_api_key_here
LLM_MODEL=gpt-4o-mini

# n8n Orchestration
N8N_WEBHOOK_URL=http://localhost:5678/webhook/medical-report-agent
N8N_TIMEOUT_MS=60000

# File Uploads
MAX_FILE_SIZE_MB=15
```

> **Note on API Keys**: The system operates with full functionality in development mode even **without external API keys**. If `LLM_API_KEY` or `N8N_WEBHOOK_URL` is unconfigured or unreachable, the system automatically runs its embedded autonomous clinical rules and RAG engine.

---

## 8. Docker Deployment
To launch the complete containerized stack (PostgreSQL with pgvector, n8n, backend, frontend):
```bash
docker-compose up --build -d
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- n8n Automation: `http://localhost:5678`
- PostgreSQL: `localhost:5432`

To stop:
```bash
docker-compose down
```

---

## 9. n8n Workflow Integration
1. Open n8n at `http://localhost:5678/`.
2. Select **Workflows** → **Import from File**.
3. Choose `n8n/workflows/medical_report_agent.json`.
4. Configure your preferred LLM credentials on the Agent node.
5. Toggle the workflow to **Active**.
6. The backend will automatically route requests through n8n.

---

## 10. Medical RAG Ingestion
To re-index or ingest new clinical guidelines:
```bash
node rag/ingestion/ingest.js
```
This parses all Markdown files in `rag/documents/` (NIH, CDC, WHO guidelines) and compiles them into `rag/knowledge_base_vectors.json`.

---

## 11. Testing
Run the complete automated test suite (unit tests, extraction tests, safety guardrails, voice & multilingual assistant, Real Agentic RAG system, REST API tests):
```bash
cd backend
npm test
```
All 27 tests pass:
- ✅ Report extraction & analyte parsing
- ✅ Laboratory-specific reference range analyzer
- ✅ Emergency red-flag symptom interception (Multilingual & Hindi/Hinglish)
- ✅ Prescription & dosage alteration refusal (Multilingual & Hindi/Hinglish)
- ✅ PII sanitization (SSNs, emails, phone numbers)
- ✅ Voice spoken report summary generation (English, Hindi, Hinglish)
- ✅ Hindi / Hinglish parameter queries with medical terminology retention
- ✅ 384-dimensional dense normalized vector embeddings & cosine similarity calculations
- ✅ Authoritative knowledge base vector search with source metadata and relevance tiers
- ✅ Agentic query intent classification (Intents A, B, C, D, E) and selective tool invocation
- ✅ Non-hallucinatory patient value grounding fused with verified clinical evidence
- ✅ Prior turn conversation memory recall
- ✅ Multilingual RAG retrieval (English, Hindi, Hinglish)
- ✅ PDF document upload & analysis
- ✅ Follow-up chat with conversation memory & report context

---

## 12. Research & Evaluation Framework
Run the empirical research benchmark comparing **System A**, **System B**, and **System C**:
```bash
node evaluation/run_evaluation.js
```
### Benchmark Summary:
| Metric | System A (Zero-Shot) | System B (LLM + RAG) | System C (Agentic AI) |
|---|---|---|---|
| **Extraction $F_1$ Score** | 0.871 | 0.918 | **1.000** ⭐ |
| **Abnormal Sensitivity** | 0.686 | 0.686 | **1.000** ⭐ |
| **Abnormal Specificity** | 1.000 | 1.000 | **1.000** ⭐ |
| **Hallucination Rate** | 18.0% | 6.0% | **1.0%** ⭐ |
| **Source Groundedness** | 42.0% | 88.0% | **98.0%** ⭐ |
| **Clinical Safety Score** | 100.0% | 100.0% | **100.0%** ⭐ |

See [docs/research.md](docs/research.md) for full research methodology and findings.

---

## 13. Clinical Safety & Medical Disclaimers
1. **Educational Assistant Only**: This application is an educational aid designed to promote health literacy. It is **not a doctor** and does **not provide definitive medical diagnoses**.
2. **Strict Prescription Policy**: The system will **never** advise a user to start, stop, or change any prescription or over-the-counter medication.
3. **Emergency Escalation**: When acute red-flag symptoms (severe chest pain, shortness of breath, loss of consciousness) are detected, the system immediately directs the user to emergency medical services.
4. **Physician Integrity**: The system never alleges malpractice, incompetence, or intentional overcharging by healthcare providers.

---

## 14. License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
