# Real Medical Agentic RAG System

## 1. What is Medical RAG?
**Retrieval-Augmented Generation (RAG)** is a clinical AI architecture that anchors language model generation in an authoritative external knowledge base rather than relying solely on the parametric memory of a neural network.

In clinical diagnostics, conventional zero-shot LLMs are prone to:
- Inventing normal reference intervals that conflict with specific diagnostic analyzers.
- Fabricating citations to non-existent clinical trials.
- Failing to reflect recent updates in international screening guidelines (e.g. ADA diabetes criteria or KDIGO kidney thresholds).

Our **Medical RAG System** grounds every explanation directly in verified evidence from recognized medical authorities:
- **National Institutes of Health (NIH) - MedlinePlus**
- **Centers for Disease Control and Prevention (CDC)**
- **World Health Organization (WHO)**
- **American Heart Association (AHA)**
- **American Diabetes Association (ADA)**

---

## 2. Ingestion & Dense Vector Embedding Pipeline

```
Authoritative Documents (Markdown)
               │
               ▼
   Text Cleaning & Sanitization
               │
               ▼
   Semantic Chunking (500 chars, 80 char overlap)
               │
               ▼
   Dense Vector Embeddings (384-dimensional space)
               │
               ▼
   Metadata Association (Title, Org, URL, Category, Topic, Timestamp)
               │
               ▼
   Vector Database (PostgreSQL pgvector / JSON Vector Store)
```

### Chunking Specification
- **`CHUNK_SIZE`**: 500 characters
- **`CHUNK_OVERLAP`**: 80 characters
- Preserves continuous clinical context across chunk boundaries so diagnostic criteria and reference intervals remain intact.

### Embeddings Engine (`embeddingService.js`)
- Supports OpenAI `text-embedding-3-small` when `EMBEDDING_API_KEY` is provided.
- Includes an autonomous **384-dimensional dense semantic feature vector generator** using normalized L2 cosine projections, character trigram shingles, and clinical term weighting for 100% dependable local execution.

---

## 3. Semantic Retrieval & Cosine Similarity

The retriever computes cosine similarity between the query embedding $\mathbf{u}$ and document chunk embeddings $\mathbf{v}$:

$$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$

### Filtering & Ranking
- **`RAG_TOP_K`**: Top 3 most relevant clinical chunks.
- **`RAG_SIMILARITY_THRESHOLD`**: Minimum relevance threshold.
- Retains full metadata for complete traceability:
  - `title`: e.g. "Hemoglobin (Hb) Reference"
  - `organization`: e.g. "National Institutes of Health (NIH MedlinePlus)"
  - `url`: e.g. `https://medlineplus.gov/lab-tests/complete-blood-count/`
  - `relevance_score`: Floating point score from 0.00 to 0.99
  - `relevance_tier`: "High", "Moderate", or "Relevant".

---

## 4. RAG + Patient Report Context Fusion
The RAG system **never operates in isolation from the patient's uploaded report**:
1. The **Report Analyzer** extracts the exact numerical value, unit, and reference interval printed on the patient's lab sheet.
2. The **RAG Retriever** fetches evidence-based context explaining biological function and common reasons for deviations.
3. The **Coordinator** synthesizes an explanation that:
   - Mentions the patient's exact value (never hallucinates).
   - Explains the finding using verified NIH/CDC evidence.
   - Clarifies that laboratory reference ranges depend on analyzer instrumentation.
   - Formulates questions for the patient's doctor.

---

## 5. Execution Commands
To re-run the ingestion pipeline:
```bash
node rag/ingestion/ingest.js
```
To verify vector similarity search:
```bash
npm test
```
