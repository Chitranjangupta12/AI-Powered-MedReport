# Vision & OCR Analysis for Medical Documents

## Overview
Diagnostic imaging reports and procedural catheterization records frequently feature diagrams, handwritten doctor notations, and tabular stenosis percentages. The Vision & OCR subsystem parses both spatial structure and optical characters across multi-page files.

## Extraction Architecture

### 1. Optical Character Recognition (OCR)
* **Engine**: Tesseract OCR (with multi-page batch orchestration)
* **Supported Mime Types**: `application/pdf`, `image/png`, `image/jpeg`, `image/jpg`
* **Page Provenance Tracking**: Every extracted text element and numerical value preserves its `source_page` index (e.g. `[Page 1]`, `[Page 2]`).

### 2. Medical Layout & Feature Detection
The analyzer detects:
* **Coronary Artery Branching & Diagrams**:
  - Left Main Coronary Artery (LMCA)
  - Left Anterior Descending Artery (LAD)
  - Left Circumflex Artery (LCx)
  - Right Coronary Artery (RCA)
  - Posterior Descending Artery (PDA)
* **Luminal Stenosis Percentages**:
  - Normal / Patent: `0%` or `< 50%`
  - Moderate: `50% - 69%`
  - Severe / Hemodynamically Significant: `≥ 70%`
  - Total Occlusion: `100%`
* **Procedural Hemodynamics**:
  - Aortic Pressure (e.g., `135/82 mmHg`)
  - Left Ventricular End-Diastolic Pressure (LVEDP, e.g., `14 mmHg`)
  - Left Ventricular Ejection Fraction (LVEF, e.g., `55%`)
* **Clinical Recommendations**:
  - Interventional revascularization (PCI / Drug-eluting stents)
  - Surgical revascularization (CABG)
  - Guideline-Directed Medical Therapy (GDMT)

### 3. Handling Unclear or Faint Handwriting
When handwriting cannot be deciphered with high confidence:
* The raw phrase or segment is preserved verbatim.
* Assigned `status: "unclear / requires verification"` and `confidence: 0.45`.
* Displayed in the UI in an explicit handwritten document warning box.
* Prevents hallucination of lab numbers or treatment recommendations.
