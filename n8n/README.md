# n8n AI Agent Workflow Orchestration

## 1. Architecture Overview
This directory contains the n8n workflow definition and integration configuration for the **Agentic AI Medical Report Understanding & Patient Guidance System**.

The workflow orchestrates an autonomous multi-tool agent that receives medical reports, calls specialized tools (Document Extraction, Lab Analysis, Medical RAG, Risk Urgency Stratification, Safety Filter), and returns structured clinical summaries to the Express backend.

```
Node.js Backend (POST /api/n8n/webhook)
       ↓
n8n Webhook Node (/webhook/medical-report-agent)
       ↓
Validate & Normalize Payload
       ↓
AI Agent Controller (LangChain Agent Node)
       ├── Tool 1: Report Extractor (extracts analyte parameters, values, units, lab ref ranges)
       ├── Tool 2: Lab Analyzer (bounds-tests strictly against report reference interval)
       ├── Tool 3: Medical RAG (retrieves verified knowledge from NIH MedlinePlus & CDC)
       └── Tool 4: Risk Assessor (evaluates urgency: GREEN, YELLOW, RED)
       ↓
Structured Output Parser (validates against structured_report_response.json)
       ↓
Respond to Webhook Node
       ↓
Return to Node.js Backend & Patient React UI
```

## 2. Importing the Workflow into n8n
1. Open your local n8n instance at `http://localhost:5678/`.
2. In the left navigation bar, click **Workflows** → **Add Workflow** (or the `...` menu in the upper right).
3. Select **Import from File**.
4. Browse and select `n8n/workflows/medical_report_agent.json`.
5. The full workflow canvas will appear with all connected tool nodes.

## 3. Configuring LLM Credentials in n8n
1. Double-click the **Agentic Medical Coordinator** node (or the attached Model sub-node).
2. Under **Credentials**, add your preferred LLM provider (e.g., OpenAI API Key, Anthropic API Key, Google PaLM/Gemini, or local Ollama).
3. Save the credential.
4. Toggle the workflow to **Active** in the top right header.

## 4. Dual-Engine Architecture & Fallback
The backend (`backend/src/services/agentService.js`) implements an intelligent **Dual-Engine architecture**:
- If `N8N_WEBHOOK_URL` is reachable and n8n is running, all analysis and chat queries are processed through n8n.
- If n8n is temporarily offline or in development mode without external API keys, the Node.js backend seamlessly executes an embedded, deterministic clinical rules and tool-orchestration engine that guarantees:
  - Exact JSON schema compatibility
  - Clinical safety guardrails enforcement
  - Non-diagnostic guidance and emergency alerts
  - Complete zero-downtime development and testing
