# Medical Report Understanding - Backend API

## 1. Overview
The backend is a Node.js/Express service providing REST APIs for medical report upload, document text extraction (PDF & OCR), agent tool orchestration, conversation memory, and clinical safety enforcement.

## 2. Key Features
- **Strict File Upload Validation**: Multi-layer checking for MIME type, file extension, max size (15 MB), and corrupted/zero-byte files.
- **Pure-JS Document Extraction**:
  - `pdf-parse` for digital laboratory PDFs.
  - `tesseract.js` OCR for scanned images and photos (PNG, JPG, JPEG).
- **Agentic Coordinator**:
  - Webhook dispatch to n8n AI Agent when running.
  - Resilient local tool orchestration fallback (Extraction Tool, Lab Analyzer Tool, Medical RAG, Risk Assessor).
- **Clinical Safety Guardrails**:
  - Redacts PII (SSNs, phone numbers, emails).
  - Intercepts emergency red-flag symptoms and issues emergency triage alerts.
  - Intercepts and refuses prescription/dosage requests.
- **Resilient Data Storage**:
  - Supports PostgreSQL with pgvector.
  - Automatically falls back to high-performance local store in standalone dev mode.

## 3. Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload PDF/image report, extract parameters, analyze with Agent |
| `POST` | `/api/chat` | Send follow-up question with conversation memory |
| `GET` | `/api/reports` | List previous reports |
| `GET` | `/api/reports/:id` | Get details and structured analysis of a specific report |
| `DELETE` | `/api/reports/:id` | Delete report record and associated upload file |
| `GET` | `/api/conversations` | List previous chat sessions |
| `GET` | `/api/conversations/:id/messages` | Get message history for a conversation |
| `POST` | `/api/n8n/webhook` | Inbound webhook callback for n8n orchestrator |
| `GET` | `/api/evaluations` | Retrieve research benchmark metrics |
| `GET` | `/api/health` | Health check and database status |

## 4. Running the Backend
```bash
# Install dependencies
npm install --ignore-scripts

# Generate sample PDF test reports
npm run generate-samples

# Start backend server
npm start
```
Default URL: `http://localhost:5000`
