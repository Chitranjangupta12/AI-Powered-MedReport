# Clinical AI Research Evaluation Framework

## 1. Research Overview & Problem Statement
Direct patient access to laboratory results (via electronic health portals) often triggers health anxiety when patients encounter unexplained abnormal flags and complex biochemical jargon. While large language models (LLMs) can synthesize explanations, unconstrained models present substantial clinical safety risks:
1. **Hallucinated Reference Ranges**: Applying generic adult male reference intervals to pediatric or female cohorts, ignoring lab-specific assay calibration.
2. **Unsupported Clinical Claims**: Extrapolating definitive diagnoses (e.g. diagnosing leukemia from a reactive leukocytosis).
3. **Prescriptive Medical Errors**: Giving unverified medication or dosage instructions.

## 2. Research Questions
- **RQ1**: Does an agentic multi-tool architecture (System C) significantly outperform unconstrained zero-shot LLMs (System A) and basic RAG architectures (System B) in extraction fidelity ($F_1$) and abnormal value sensitivity?
- **RQ2**: How effectively does grounding through authoritative medical repositories (NIH MedlinePlus, CDC, AHA) suppress factual hallucination rates?
- **RQ3**: Can strict tool boundary testing and clinical guardrails achieve 100% adherence to non-diagnostic and non-prescriptive safety constraints?

## 3. Evaluated Architectures
- **System A (Baseline Zero-Shot LLM)**: Direct prompt passing raw report text to LLM without external retrieval or specialized extraction tools.
- **System B (LLM + RAG)**: Augments the LLM with semantic retrieval from verified clinical knowledge chunks (NIH, CDC, WHO), but relies on the LLM itself for parsing and comparison.
- **System C (Agentic AI + Multi-Tool Orchestration)**: Deploys autonomous tool orchestration:
  1. *Document / OCR Extractor*
  2. *Lab Reference Range Analyzer* (strictly bounds-tested against the report's laboratory-printed interval)
  3. *Medical RAG* (retrieves verified physiological significance)
  4. *Risk & Urgency Triage Assessor* (GREEN, YELLOW, RED classification)
  5. *Clinical Safety & PII Redaction Guardrail*

## 4. Empirical Evaluation Metrics
| Metric | Definition & Clinical Relevance | Target Goal |
|---|---|---|
| **Extraction $F_1$ Score** | Harmonic mean of precision and recall for extracted analytes and numeric values. | $\ge 0.98$ |
| **Abnormal Sensitivity** | Ability to detect all true out-of-range lab markers. Critical to avoid false reassurance. | $\ge 0.95$ |
| **Abnormal Specificity** | Ability to correctly classify normal values, avoiding unnecessary patient alarm. | $\ge 0.95$ |
| **Hallucination Rate** | Proportion of generated clinical claims not grounded in the report or verified RAG chunks. | $\le 0.02$ |
| **Source Groundedness** | Measure of explicit traceable attribution to recognized health bodies (NIH, CDC, AHA). | $\ge 0.90$ |
| **Clinical Safety Score** | Strict zero-tolerance evaluation for prescription advice, definitive diagnoses, or doctor disparagement. | $1.00$ ($100\%$) |
| **Readability** | Flesch-Kincaid Reading Ease and Grade Level for patient comprehension. | Accessible |

## 5. Running the Research Benchmark
```bash
node evaluation/run_evaluation.js
```
The test results are automatically computed across the synthetic test dataset and saved to `evaluation/benchmark_results.json`.
