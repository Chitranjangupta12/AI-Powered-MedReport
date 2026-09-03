/**
 * RAG Document Ingestion and Vector Preparation Pipeline
 * 
 * Ingests authoritative clinical reference documents from ../documents/
 * Cleans, chunks with overlap, attaches full clinical metadata, and
 * generates 384-dimensional dense vector embeddings for vector similarity search.
 */

const fs = require('fs');
const path = require('path');
const embeddingService = require('../../backend/src/services/embeddingService');
const env = require('../../backend/src/config/env');

const DOCUMENTS_DIR = path.join(__dirname, '../documents');
const OUTPUT_VECTOR_FILE = path.join(__dirname, '../knowledge_base_vectors.json');

const CHUNK_SIZE = env.RAG_CHUNK_SIZE || 500;
const CHUNK_OVERLAP = env.RAG_CHUNK_OVERLAP || 80;

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Splits text into overlapping chunks if section is long
 */
function splitWithOverlap(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (!text || text.length <= chunkSize) return [text];

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);

    // Try to break cleanly on a sentence or newline if not at the end
    if (endIndex < text.length) {
      const naturalBreak = text.lastIndexOf('\n', endIndex);
      const periodBreak = text.lastIndexOf('. ', endIndex);
      if (naturalBreak > startIndex + (chunkSize / 2)) {
        endIndex = naturalBreak + 1;
      } else if (periodBreak > startIndex + (chunkSize / 2)) {
        endIndex = periodBreak + 1;
      }
    }

    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk.length > 30) {
      chunks.push(chunk);
    }

    if (endIndex >= text.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  return chunks;
}

async function chunkAndEmbedDocument(content, docMeta) {
  const sections = content.split(/###\s+/);
  const chunks = [];
  const retrievalTimestamp = new Date().toISOString();

  // Preamble / Overview
  if (sections[0] && sections[0].trim().length > 40) {
    const preambleText = sections[0].trim();
    const preambleEmbedding = await embeddingService.getEmbedding(preambleText);

    chunks.push({
      chunk_id: `${docMeta.category.toLowerCase().replace(/\s+/g, '_')}_overview_0`,
      title: `${docMeta.category} Overview`,
      parameter: 'Overview',
      category: docMeta.category,
      topic: docMeta.category,
      source: docMeta.source,
      organization: docMeta.source,
      url: docMeta.url,
      publication_date: docMeta.publication_date || '2024',
      retrieval_timestamp: retrievalTimestamp,
      content: preambleText,
      keywords: extractKeywords(preambleText),
      embedding: preambleEmbedding
    });
  }

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    const lines = sec.split('\n');
    const rawTitle = lines[0].replace(/[\d\.]/g, '').trim();
    const body = lines.slice(1).join('\n').trim();

    const fullSectionText = `[${docMeta.source}] - Parameter: ${rawTitle}\nCategory: ${docMeta.category}\n${body}`;
    const subChunks = splitWithOverlap(fullSectionText, CHUNK_SIZE, CHUNK_OVERLAP);

    for (let sIdx = 0; sIdx < subChunks.length; sIdx++) {
      const chunkText = subChunks[sIdx];
      const embedding = await embeddingService.getEmbedding(chunkText);
      const chunkId = `${docMeta.category.toLowerCase().replace(/\s+/g, '_')}_${rawTitle.toLowerCase().replace(/[\s\(\)\/\-]+/g, '_')}_${i}_${sIdx}`;

      chunks.push({
        chunk_id: chunkId,
        title: `${rawTitle} Reference`,
        parameter: rawTitle,
        category: docMeta.category,
        topic: rawTitle,
        source: docMeta.source,
        organization: docMeta.source,
        url: docMeta.url,
        publication_date: docMeta.publication_date || '2024',
        retrieval_timestamp: retrievalTimestamp,
        content: chunkText,
        keywords: extractKeywords(chunkText),
        embedding: embedding
      });
    }
  }

  return chunks;
}

async function runIngestion() {
  console.log('--- Starting Real Medical Agentic RAG Ingestion Pipeline ---');
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    console.error(`Documents directory not found at: ${DOCUMENTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DOCUMENTS_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} authoritative clinical reference documents.`);

  const allChunks = [];

  for (const file of files) {
    const filePath = path.join(DOCUMENTS_DIR, file);
    const text = fs.readFileSync(filePath, 'utf8');

    // Extract document metadata from markdown headers
    const sourceMatch = text.match(/\*\*Source Organization\*\*:\s*([^\n]+)/);
    const urlMatch = text.match(/\*\*URL\*\*:\s*([^\n]+)/);
    const catMatch = text.match(/\*\*Category\*\*:\s*([^\n]+)/);
    const dateMatch = text.match(/\*\*Last Reviewed\*\*:\s*([^\n]+)/);

    const docMeta = {
      source: sourceMatch ? sourceMatch[1].trim() : 'National Institutes of Health (NIH)',
      url: urlMatch ? urlMatch[1].trim() : 'https://medlineplus.gov/',
      category: catMatch ? catMatch[1].trim() : 'General Clinical Laboratory',
      publication_date: dateMatch ? dateMatch[1].trim() : '2024'
    };

    const chunks = await chunkAndEmbedDocument(text, docMeta);
    console.log(`[Ingested] ${file} -> Generated ${chunks.length} embedded chunks.`);
    allChunks.push(...chunks);
  }

  const outputData = {
    generated_at: new Date().toISOString(),
    embedding_dimension: embeddingService.dimension,
    embedding_provider: embeddingService.provider,
    chunk_size: CHUNK_SIZE,
    chunk_overlap: CHUNK_OVERLAP,
    total_chunks: allChunks.length,
    chunks: allChunks
  };

  fs.writeFileSync(OUTPUT_VECTOR_FILE, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`\n===============================================================`);
  console.log(`✓ Successfully created Vector Knowledge Store at:`);
  console.log(`  ${OUTPUT_VECTOR_FILE}`);
  console.log(`  Total Embedded Chunks: ${allChunks.length}`);
  console.log(`  Embedding Dimension: ${embeddingService.dimension}`);
  console.log(`===============================================================\n`);
}

if (require.main === module) {
  runIngestion().catch(err => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  });
}

module.exports = { runIngestion, chunkAndEmbedDocument, splitWithOverlap, extractKeywords };

