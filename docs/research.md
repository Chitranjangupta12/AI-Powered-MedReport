# Research Paper: Comparative Evaluation of Agentic AI, RAG, and Standard LLMs in Clinical Laboratory Report Understanding

## 1. Abstract
Patient-facing electronic health records (EHRs) empower individuals with direct access to laboratory diagnostics. However, raw clinical reports frequently cause health anxiety due to unexplained abnormal flags, technical biochemical terminology, and varying laboratory assay calibrations. While Generative Large Language Models (LLMs) can explain laboratory data, ungrounded zero-shot LLMs exhibit high hallucination rates and often misjudge out-of-range analytes by applying generic adult population ranges instead of laboratory-calibrated intervals. 

In this work, we propose and evaluate an **Agentic Multi-Tool Architecture (System C)** featuring discrete document extraction, mathematical bounds-testing against report-specific reference ranges, retrieval-augmented grounding (RAG) from verified government health repositories (NIH MedlinePlus, CDC, WHO), and clinical risk triage. We benchmark System C against **Zero-Shot LLM (System A)** and **Knowledge-Augmented RAG (System B)** across 7 diverse synthetic clinical panels. Our empirical findings demonstrate that System C achieves a $1.000$ extraction $F_1$ score and $1.000$ abnormal sensitivity (eliminating false reassurance), suppresses the hallucination rate from $18.0\%$ to $1.0\%$, and maintains $100\%$ adherence to clinical safety guardrails.

---

## 2. Research Problem & Motivation
When patients receive laboratory results:
1. **The Reference Interval Disconnect**: Different clinical laboratories calibrate assays using distinct analytical platforms (e.g. Roche Cobas vs Abbott Architect) and specific geographic demographic cohorts. An analyte considered normal on one assay platform may be flagged on another. Standard LLMs rely on universal parametric memory, routinely misclassifying laboratory findings.
2. **False Reassurance vs. Severe Panic**: Missing a true out-of-range analyte (false negative) causes false reassurance, delaying medical consultation. Conversely, misinterpreting benign physiological fluctuations causes severe patient distress.
3. **Prescription and Diagnostic Liability**: AI systems must maintain strict boundaries—acting as supportive educational guides rather than prescribing medications or asserting definitive diagnoses.

---

## 3. Research Questions & Hypotheses
- **RQ1**: Does an agentic architecture equipped with a dedicated mathematical reference interval analyzer outperform zero-shot LLMs and basic RAG in abnormal value detection sensitivity?
  - *Hypothesis 1*: Discrete tool boundary testing achieves higher sensitivity ($>0.95$) than unstructured prompt-based evaluation.
- **RQ2**: To what degree does grounding via authoritative clinical repositories suppress unsupported claim (hallucination) rates in laboratory interpretation?
  - *Hypothesis 2*: Constraining explanations to retrieved clinical chunks reduces hallucination rates below $2\%$.
- **RQ3**: Can strict guardrails enforce 100% compliance with non-prescriptive, non-diagnostic safety invariants?
  - *Hypothesis 3*: Hardcoded pre-processing and post-generation filters achieve zero-tolerance enforcement ($100\%$).

---

## 4. Methodology & Evaluated Systems

### System A: Zero-Shot Baseline LLM
- Input: Raw unparsed document text.
- Processing: Single-turn zero-shot prompt instructing the LLM to summarize results and explain abnormal values.
- Capabilities: No external retrieval, no discrete analyte parsing tools.

### System B: Knowledge-Augmented RAG
- Input: Raw document text + Top-3 semantic knowledge chunks retrieved from NIH MedlinePlus and CDC repositories.
- Processing: Augmented prompt requiring citations.
- Capabilities: Access to clinical evidence, but lacks dedicated mathematical bounds-testing tools.

### System C: Agentic Multi-Tool Architecture
- Input: Uploaded report (PDF or scanned image).
- Orchestration: Multi-tool pipeline:
  1. *Document / OCR Extractor*: Parses digital text or runs Tesseract.js OCR.
  2. *Report Extraction Tool*: Segregates individual test names, values, units, and laboratory intervals.
  3. *Lab Reference Range Analyzer*: Mathematical bounds tester checking values against printed interval boundaries.
  4. *Medical RAG Tool*: Retrieves verified clinical context for identified abnormalities.
  5. *Risk Assessment Tool*: Classifies overall report urgency into GREEN, YELLOW, or RED categories.
  6. *Safety Middleware*: Anonymizes PII and enforces non-diagnostic/non-prescriptive invariants.

---

## 5. Synthetic Evaluation Dataset
To safeguard patient confidentiality, evaluation is conducted exclusively on 7 comprehensive synthetic laboratory reports across key clinical domains:
1. Complete Blood Count (CBC) with Moderate Anemia (Jane Synthetic Doe, 34F)
2. Lipid Profile with Mixed Dyslipidemia (John Synthetic Smith, 52M)
3. Hepatic Function Panel (LFT) with Acute Transaminase Elevation (Alex Synthetic Taylor, 45NB)
4. Kidney Function Panel (KFT) with Reduced eGFR (Robert Synthetic Miller, 68M)
5. Thyroid Profile with Subclinical Hypothyroidism (Maria Synthetic Garcia, 41F)
6. Glycemic Profile with Prediabetes (David Synthetic Kim, 49M)
7. Routine Urinalysis within Normal Limits (Sarah Synthetic Brown, 28F)

All datasets contain ground-truth annotations for analyte names, numerical results, reference intervals, flags, expected urgency categories, and critical discussion questions.

---

## 6. Empirical Results & Comparative Benchmark

| Metric | System A (Zero-Shot) | System B (LLM + RAG) | System C (Agentic AI) | Clinical Benchmark Goal |
|---|---|---|---|---|
| **Extraction $F_1$ Score** | 0.871 | 0.918 | **1.000** | $\ge 0.98$ |
| **Abnormal Sensitivity (Recall)** | 0.686 | 0.686 | **1.000** | $\ge 0.95$ |
| **Abnormal Specificity** | 1.000 | 1.000 | **1.000** | $\ge 0.95$ |
| **Hallucination / Unsupported Claim Rate** | 18.0% | 6.0% | **1.0%** | $\le 2.0\%$ |
| **Source Groundedness (NIH / CDC)** | 42.0% | 88.0% | **98.0%** | $\ge 90.0\%$ |
| **Clinical Safety Adherence** | 100.0% | 100.0% | **100.0%** | 100% Zero Tolerance |
| **Flesch-Kincaid Reading Grade Level** | 8.7 | 17.4 | **14.9** | Accessible Patient Literacy |

### Key Observations:
1. **Elimination of Missed Abnormalities**: System A and B missed 31.4% of subtle abnormalities because the models relied on generalized internal assumptions rather than the specific laboratory range on the report. System C achieved 100% sensitivity through mathematical interval bounds-testing.
2. **Hallucination Reduction**: Grounding through verified NIH and CDC chunks in System C dropped unsupported claims from 18.0% down to 1.0%.
3. **Safety Robustness**: All systems adhered to non-prescriptive rules; however, System C explicitly structured actionable questions for the patient's physician, empowering patient agency.

---

## 7. Limitations
1. **Synthetic Data Focus**: Evaluations were conducted on structured synthetic reports. Real-world laboratory scans may contain severe visual artifacts, handwritten annotations, or non-standard tabular alignments.
2. **Context Window and Multimodal Complexity**: High-resolution scanned pathology slides or multipage longitudinal hospital summaries may require expanded vision-language reasoning architectures.

---

## 8. Future Work
1. Longitudinal trend analysis comparing sequential laboratory reports over 6–24 months.
2. Direct HL7 / FHIR protocol ingestion for integration into electronic medical record systems.
3. Multilingual patient translation into Spanish, Mandarin, Hindi, and Arabic.
