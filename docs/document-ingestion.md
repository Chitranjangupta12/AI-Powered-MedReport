# Multimodal Medical Document Ingestion Architecture

## Overview
The Multimodal Document Ingestion Pipeline processes diverse clinical documents ranging from standard digital laboratory PDFs to complex multi-page scanned, handwritten, and diagram-rich cardiac catheterization records.

```
                  User Uploads PDF / Image
                             │
                             ▼
              [Multimodal Document Inspector]
             (Inspect page count, density, 
              handwriting/diagram markers)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Machine-Readable PDF]           [Scanned / Image PDF]
            │                                 │
     Direct Stream Text               Render Each Page
        Extraction                            │
            │                        [Multi-Page OCR]
            │                        (Tesseract Engine)
            │                                 │
            │                     [Visual Layout Analyzer]
            │                     (Diagrams, Tables, Lesions,
            │                      Handwritten Annotations)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
              [Structured Medical Document JSON]
           (Patient info, procedure, vascular trees,
            stenosis percentages, source pages,
            uncertainty tags, clinical recommendations)
                             │
                             ▼
              [Agentic RAG Knowledge Retrieval]
            (ACC/AHA/NHLBI guidelines, vectors)
                             │
                             ▼
          [Patient Guidance & Interactive Assistant]
          (Plain language, Voice, Hindi/Hinglish)
```

## Key Capabilities

### 1. Multi-Page Document Inspection & Scanned Detection
* **Module**: `backend/src/services/multimodalDocumentService.js`
* **Scanned Character Threshold**: When a PDF page has an average text density of less than 50 characters, or contains markers indicating scanned fluoroscopy, handwritten notes, or diagrams, it is classified as `scanned_pdf`.
* **Multi-page Processing**: Both Page 1 and Page 2 (and subsequent pages) are inspected and parsed. The system never restricts parsing to only the initial page.

### 2. Multi-Page OCR & Optical Layout
* **Module**: `backend/src/services/ocrService.js`
* Evaluates rasterized images and scanned pages using Tesseract OCR.
* Extracts printed typography, handwritten percentage notations, and structured tabulations across each distinct page.

### 3. Visual Layout & Diagram Analysis
* **Module**: `backend/src/services/visionService.js`
* Identifies coronary artery diagrams (LMCA, LAD, LCx, RCA, PDA).
* Extracts stenosis percentages (`75%`, `90%`, `30%`) with segment descriptors.
* Detects operator summary notes, left ventriculography metrics (ejection fraction, wall motion), and cardiological recommendations (stenting/PCI, CABG, medical therapy).
* Supports external multimodal Vision LLMs (`gpt-4o`) when configured, and operates autonomously with high-accuracy deterministic visual layout parsing offline.

### 4. Uncertainty & Low-Confidence Safeguards
* If handwritten text is faint, smudged, or ambiguous, the pipeline marks the finding as:
  `status: "unclear / requires verification"`
* The system never invents numbers or medical interpretations.
* Displays a dedicated alert banner in the user interface advising the patient to verify the original document directly with their physician.
