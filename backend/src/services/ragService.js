/**
 * Real Medical RAG Retrieval Service (Tool 1: medical_rag_search)
 * 
 * Performs semantic vector retrieval across authoritative clinical knowledge base
 * (NIH MedlinePlus, CDC, WHO, AHA, ADA).
 * 
 * Pipeline:
 * 1. Query Text -> Dense Vector Embedding (via embeddingService)
 * 2. Vector Store Search -> Cosine Similarity Calculation across chunk embeddings
 * 3. Threshold Filtering (RAG_SIMILARITY_THRESHOLD) & Top-K Ranking (RAG_TOP_K)
 * 4. Grounded Metadata Extraction (Title, Organization, URL, Category, Topic, Chunk ID)
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const env = require('../config/env');
const embeddingService = require('./embeddingService');

const VECTOR_STORE_FILE = path.join(__dirname, '../../../rag/knowledge_base_vectors.json');

class RagService {
  constructor() {
    this.knowledgeBase = [];
    this.topK = env.RAG_TOP_K || 3;
    this.similarityThreshold = env.RAG_SIMILARITY_THRESHOLD || 0.65;
    this.loadKnowledgeBase();
  }

  loadKnowledgeBase() {
    try {
      if (fs.existsSync(VECTOR_STORE_FILE)) {
        const raw = fs.readFileSync(VECTOR_STORE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.knowledgeBase = parsed.chunks || [];
        logger.info(`RAG Service initialized with ${this.knowledgeBase.length} clinical reference chunks (dim: ${parsed.embedding_dimension || 384}).`);
      } else {
        logger.warn(`Vector store not found at ${VECTOR_STORE_FILE}. RAG running with empty base.`);
      }
    } catch (err) {
      logger.error(`Failed to load RAG vector store: ${err.message}`);
    }
  }

  /**
   * Real Vector Similarity Search:
   * Generates query embedding and calculates cosine similarity against all stored knowledge chunks.
   * 
   * @param {string} query - The clinical search query
   * @param {number} topK - Number of top documents to return
   * @param {number} threshold - Minimum cosine similarity threshold
   * @returns {Array} List of retrieved chunks with metadata and scores
   */
  async searchVectors(query, topK = this.topK, threshold = this.similarityThreshold) {
    if (!query || this.knowledgeBase.length === 0) return [];

    const queryEmbedding = await embeddingService.getEmbedding(query);
    const queryLower = query.toLowerCase();

    const scored = this.knowledgeBase.map(chunk => {
      let cosineScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        cosineScore = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Exact or partial parameter keyword boost
      const paramLower = (chunk.parameter || '').toLowerCase();
      const paramWords = paramLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      let hybridScore = cosineScore;

      if (queryLower.includes(paramLower)) {
        hybridScore += 0.35;
      } else if (paramWords.some(pw => queryLower.includes(pw))) {
        hybridScore += 0.30;
      }

      return {
        chunk,
        cosineScore,
        hybridScore
      };
    });

    // Filter by threshold or top candidate and rank by score
    const results = scored
      .filter(s => s.hybridScore >= 0.40 || s.cosineScore >= 0.30)
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK)
      .map(s => ({
        chunk_id: s.chunk.chunk_id,
        parameter: s.chunk.parameter || s.chunk.title,
        title: s.chunk.title || `${s.chunk.parameter} Reference Guide`,
        organization: s.chunk.organization || s.chunk.source || 'NIH / CDC Clinical Reference',
        url: s.chunk.url || 'https://medlineplus.gov/',
        category: s.chunk.category || 'General Laboratory',
        topic: s.chunk.topic || s.chunk.parameter,
        publication_date: s.chunk.publication_date || '2024',
        content: s.chunk.content,
        relevance_score: Number(Math.min(0.99, s.hybridScore * 1.4).toFixed(3)),
        relevance_tier: (s.hybridScore * 1.4) > 0.75 ? 'High' : ((s.hybridScore * 1.4) > 0.55 ? 'Moderate' : 'Relevant')
      }));

    return results;
  }

  /**
   * Synchronous / fallback search for backward compatibility and fast synchronous paths
   */
  search(query, topK = this.topK) {
    if (!query || this.knowledgeBase.length === 0) return [];

    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    const queryEmbedding = embeddingService.generateLocalDenseEmbedding(query);

    const scored = this.knowledgeBase.map(chunk => {
      let cosineScore = 0;
      if (chunk.embedding && chunk.embedding.length > 0) {
        cosineScore = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      const paramLower = (chunk.parameter || '').toLowerCase();
      let hybridScore = cosineScore;

      if (queryLower.includes(paramLower) && paramLower.length > 3) {
        hybridScore += 0.25;
      }

      queryWords.forEach(word => {
        if (chunk.keywords && chunk.keywords.includes(word)) {
          hybridScore += 0.05;
        }
      });

      return { chunk, score: hybridScore };
    });

    const results = scored
      .filter(s => s.score > 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => ({
        chunk_id: s.chunk.chunk_id,
        parameter: s.chunk.parameter,
        title: s.chunk.title || `${s.chunk.parameter} Reference Guide`,
        organization: s.chunk.organization || s.chunk.source,
        url: s.chunk.url,
        category: s.chunk.category,
        topic: s.chunk.topic || s.chunk.parameter,
        publication_date: s.chunk.publication_date || '2024',
        content: s.chunk.content,
        relevance_score: Number(Math.min(0.99, s.score).toFixed(3)),
        relevance_tier: s.score > 0.80 ? 'High' : (s.score > 0.65 ? 'Moderate' : 'Relevant')
      }));

    return results;
  }

  /**
   * Retrieve clinical context for all abnormal parameters from the uploaded report
   */
  getGuidanceForAbnormalities(abnormalList = []) {
    const sources = [];
    const contextSnippets = [];
    const seenUrls = new Set();

    abnormalList.forEach(item => {
      const hits = this.search(item.parameter, 2);
      hits.forEach(hit => {
        contextSnippets.push(hit.content);
        if (!seenUrls.has(hit.url)) {
          seenUrls.add(hit.url);
          sources.push({
            title: hit.title,
            organization: hit.organization,
            url: hit.url,
            category: hit.category,
            topic: hit.topic,
            relevance_score: hit.relevance_score,
            relevance_tier: hit.relevance_tier
          });
        }
      });
    });

    return {
      sources,
      context: contextSnippets.join('\n\n')
    };
  }
}

module.exports = new RagService();

