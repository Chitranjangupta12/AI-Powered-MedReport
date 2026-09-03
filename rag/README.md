# Medical RAG (Retrieval-Augmented Generation) System

## 1. Overview
The Medical RAG subsystem provides verified, authoritative medical evidence to the AI Agent before generating explanations. The primary clinical design requirement is **traceability and hallucination suppression**: every explanation for abnormal parameters must cite recognized medical institutions (NIH MedlinePlus, CDC, WHO, AHA, ADA, NKF).

## 2. Pipeline Architecture
```
Authoritative Documents (.md / PDF)
       ↓
Markdown Cleaner & Section Parser
       ↓
Parameter-Specific Chunker (extracts parameter, clinical definition, reference limits, urgency triggers)
       ↓
Embedding Generation (OpenAI text-embedding-3-small or Vector TF-IDF Fallback)
       ↓
PostgreSQL pgvector / Local Vector Knowledge Base
       ↓
Semantic Cosine Similarity Query (<0.72 threshold)
       ↓
Grounding Context injected into AI Agent Prompts
```

## 3. Trusted Sources Ingested
- **Complete Blood Count (CBC)**: NIH MedlinePlus & NHLBI
- **Lipid Panel & Cardiovascular**: American Heart Association (AHA) & CDC
- **Liver & Kidney Panels (CMP/LFT/KFT)**: NIH MedlinePlus & National Kidney Foundation (NKF)
- **Endocrine (Thyroid & Glycemic Control)**: American Thyroid Association (ATA) & American Diabetes Association (ADA)
- **Routine Urinalysis**: NIH MedlinePlus

## 4. Ingestion Command
To run the ingestion pipeline:
```bash
node rag/ingestion/ingest.js
```
This parses all Markdown documents under `rag/documents/` and generates `rag/knowledge_base_vectors.json` as well as inserting into PostgreSQL `rag_documents` and `rag_chunks` tables when connected.

## 5. Adding New Medical Guidelines
1. Add a verified Markdown document into `rag/documents/your_guideline.md`.
2. Format the top of the file with standard metadata tags:
   ```markdown
   # Guideline Name
   **Source Organization**: [Trusted Institution Name]
   **URL**: [Authoritative Reference URL]
   **Category**: [Clinical Discipline]
   ```
3. Use `### [Parameter Name]` headers for each distinct lab analyte.
4. Run `node rag/ingestion/ingest.js`.
