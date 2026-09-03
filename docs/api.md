# REST API Specification

## Base URL
```
http://localhost:5000/api
```

---

## Endpoints

### 1. Health & Status
`GET /api/health`
- **Description**: Verifies service operational readiness, database connectivity, and safety guardrail status.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-01T12:00:00.000Z",
  "version": "1.0.0",
  "service": "Agentic AI Medical Report Understanding Backend",
  "database": {
    "type": "PostgreSQL (pgvector) / Standalone Resilient Store",
    "connected": true
  },
  "n8n_integration": {
    "webhook_configured": true,
    "url": "http://localhost:5678/webhook/medical-report-agent"
  },
  "safety_guardrails": "active"
}
```

---

### 2. Upload & Analyze Medical Report
`POST /api/upload`
- **Description**: Accepts multipart file upload (`report` field). Extracts document text, bounds-tests values, executes RAG, and produces structured analysis.
- **Content-Type**: `multipart/form-data`
- **Allowed Formats**: `.pdf`, `.png`, `.jpg`, `.jpeg` (Max 15 MB)
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Medical report successfully uploaded, extracted, and analyzed.",
  "report": {
    "id": "7fa12345-e89b-12d3-a456-426614174000",
    "original_filename": "cbc_report.pdf",
    "file_type": "application/pdf",
    "file_size_bytes": 105600,
    "status": "analyzed"
  },
  "conversation_id": "conv-8841-a1b2",
  "result": {
    "summary": "Patient-friendly explanation of overall results...",
    "report_type": "Complete Blood Count (CBC)",
    "important_findings": [
      "Hemoglobin is Low at 9.4 g/dL (Lab Normal: 12.0 - 15.5 g/dL)."
    ],
    "normal_findings": [
      {
        "parameter": "White Blood Cell (WBC)",
        "result_value": 6.8,
        "unit": "10^3/uL",
        "reference_range": "4.5 - 11.0"
      }
    ],
    "abnormal_findings": [
      {
        "parameter": "Hemoglobin",
        "result_value": 9.4,
        "unit": "g/dL",
        "reference_range": "12.0 - 15.5",
        "status": "Low",
        "plain_explanation": "Value is lower than your laboratory's normal range."
      }
    ],
    "questions_for_doctor": [
      "What is causing my low hemoglobin level?",
      "Would you recommend checking my ferritin or iron panel?"
    ],
    "general_guidance": [
      "Ensure a nutrient-rich diet and report any fatigue or dizziness to your doctor."
    ],
    "urgency": "consultation",
    "urgency_category": "YELLOW",
    "sources": [
      {
        "title": "Complete Blood Count Reference Guide",
        "organization": "National Institutes of Health (NIH MedlinePlus)",
        "url": "https://medlineplus.gov/lab-tests/complete-blood-count/"
      }
    ]
  }
}
```

---

### 3. Conversational Chat
`POST /api/chat`
- **Description**: Dispatches a user question with conversation memory. Redacts PII, checks emergency symptoms and prescription requests.
- **Request Body**:
```json
{
  "conversation_id": "conv-8841-a1b2",
  "report_id": "7fa12345-e89b-12d3-a456-426614174000",
  "message": "What did you say about my hemoglobin?"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "conversation_id": "conv-8841-a1b2",
  "message": {
    "id": "msg-001",
    "sender": "assistant",
    "role": "assistant",
    "content": "In your report, Hemoglobin was measured at 9.4 g/dL...",
    "created_at": "2026-03-01T12:05:00Z"
  },
  "sources": [...],
  "urgency": "consultation",
  "urgency_category": "YELLOW",
  "is_emergency": false,
  "is_prescription_query": false
}
```

---

### 4. Report Management
- `GET /api/reports`: Lists all uploaded reports.
- `GET /api/reports/:id`: Fetches report metadata, structured result, and conversation context.
- `DELETE /api/reports/:id`: Deletes report record and permanently purges the physical file from disk storage.

---

### 5. Research & Evaluation Benchmark
`GET /api/evaluations`
- **Description**: Returns empirical evaluation metrics comparing System A (Zero-shot LLM), System B (LLM + RAG), and System C (Agentic AI + Tools), alongside synthetic dataset metadata.
