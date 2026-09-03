# Real Medical Agentic RAG System

## 1. What is Medical RAG?
**Retrieval-Augmented Generation (RAG)** is a clinical AI architecture that anchors language model generation in an authoritative external knowledge base rather than relying solely on the parametric memory of a neural network.

In clinical diagnostics, conventional zero-shot LLMs are prone to:
- Inventing normal reference intervals that conflict with specific diagnostic analyzers.
- Fabricating citations to non-existent clinical trials.
- Failing to reflect recent updates in international screening guidelines (e.g. ACC/AHA cardiology stenosis thresholds, ADA diabetes criteria, or KDIGO kidney thresholds).

Our **Medical RAG System** grounds every explanation directly in verified evidence from recognized medical authorities:
- **American College of Cardiology (ACC) & American Heart Association (AHA)**
- **National Heart, Lung, and Blood Institute (NHLBI)**
- **National Institutes of Health (NIH) - MedlinePlus**
- **Centers for Disease Control and Prevention (CDC)**
- **World Health Organization (WHO)**
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
   Vector Database (PostgreSQL pgvector / JSON Vector Store: 61 dense chunks)
```

### Knowledge Base Expansion for Multimodal Cardiology & Angiography
The knowledge base includes comprehensive clinical reference guidelines for coronary angiography (`cardiology_angiogram_guidelines.md`):
- **Coronary Vascular Anatomy**: LMCA, LAD, LCx, RCA, PDA.
- **Stenosis Grading Criteria**:
  - `< 50%`: Mild / Non-obstructive
  - `50% - 69%`: Moderate
  - `≥ 70%`: Severe / Hemodynamically Significant
  - `100%`: Total Occlusion
- **Clinical Pathways**: Revascularization criteria (PCI with drug-eluting stents vs CABG surgery vs Guideline-Directed Medical Therapy).

---

## 3. Semantic Retrieval & Cosine Similarity

The retriever computes cosine similarity between the query embedding $\mathbf{u}$ and document chunk embeddings $\mathbf{v}$:

$$\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$

### Filtering & Ranking
- **`RAG_TOP_K`**: Top 3 most relevant clinical chunks.
- **`RAG_SIMILARITY_THRESHOLD`**: Minimum relevance threshold.
- Retains full metadata for complete traceability:
  - `title`: e.g. "Coronary Artery Stenosis and Catheterization Reference"
  - `organization`: e.g. "American College of Cardiology (ACC) / AHA"
  - `url`: e.g. `https://www.acc.org/guidelines`
  - `relevance_score`: Floating point score from 0.00 to 0.99
  - `relevance_tier`: "High", "Moderate", or "Relevant".

---

## 4. RAG + Patient Report Context Fusion
The RAG system **never operates in isolation from the patient's uploaded report**:
1. The **Multimodal Ingestion & Vision Analyzer** extracts the exact numerical value, artery names, units, and reference intervals from the patient's report across multiple pages.
2. The **RAG Retriever** fetches evidence-based context explaining biological function and clinical guidelines for deviations.
3. The **Coordinator** synthesizes an explanation that:
   - Mentions the patient's exact values (e.g. LAD 75%, RCA 90%) without inventing numbers.
   - Explains the findings using verified ACC/AHA and NIH evidence.
   - Marks unclear handwriting explicitly as `unclear / requires verification`.
   - Formulates focused questions for the patient's cardiologist or physician.

---

## 5. Execution Commands
To re-run the ingestion pipeline:
```bash
node rag/ingestion/ingest.js
```
To verify vector similarity search and all unit/integration tests:
```bash
npm test
```
