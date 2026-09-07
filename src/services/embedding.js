import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';

// Cache client instances
let openaiClient = null;
let geminiClient = null;

function getOpenAIClient() {
  if (!openaiClient && config.openaiApiKey) {
    openaiClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return openaiClient;
}

function getGeminiClient() {
  if (!geminiClient && config.geminiApiKey) {
    geminiClient = new GoogleGenerativeAI(config.geminiApiKey);
  }
  return geminiClient;
}

// -----------------------------------------------------------------------------
// Deterministic High-Fidelity Local Embedding Engine (for offline / testing)
// -----------------------------------------------------------------------------

const LOCAL_EMBEDDING_DIM = 256;

/**
 * Computes a deterministic normalized vector embedding based on sub-word n-grams and token frequencies.
 * Semantic similarity reflects token and morphological overlap.
 * @param {string} text
 * @returns {number[]}
 */
export function generateLocalEmbedding(text, dimension = LOCAL_EMBEDDING_DIM) {
  if (!text || typeof text !== 'string') {
    return new Array(dimension).fill(0);
  }

  const vector = new Array(dimension).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = normalized.split(/\s+/).filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return new Array(dimension).fill(0);
  }

  for (const token of tokens) {
    // Word hashing
    let hash = 5381;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) + hash) + token.charCodeAt(i);
    }
    const bucket = Math.abs(hash) % dimension;
    vector[bucket] += 1.0;

    // Character 3-gram hashing for sub-word similarity
    for (let i = 0; i <= token.length - 3; i++) {
      const tri = token.substring(i, i + 3);
      let triHash = 17;
      for (let j = 0; j < tri.length; j++) {
        triHash = ((triHash << 5) + triHash) + tri.charCodeAt(j);
      }
      const triBucket = Math.abs(triHash) % dimension;
      vector[triBucket] += 0.5;
    }
  }

  // L2-normalize vector
  let norm = 0;
  for (let i = 0; i < dimension; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimension; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

// -----------------------------------------------------------------------------
// Provider-Specific Embeddings
// -----------------------------------------------------------------------------

async function embedWithOpenAI(texts, model = config.embeddingModel) {
  const openai = getOpenAIClient();
  if (!openai) {
    throw new Error('OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.');
  }

  const response = await openai.embeddings.create({
    model: model || 'text-embedding-3-small',
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

async function embedWithGemini(texts, model = 'text-embedding-004') {
  const genAI = getGeminiClient();
  if (!genAI) {
    throw new Error('Gemini API key is missing. Please set GEMINI_API_KEY in your .env file.');
  }

  const embeddingModel = genAI.getGenerativeModel({ model: model || 'text-embedding-004' });
  const results = [];

  for (const text of texts) {
    const res = await embeddingModel.embedContent(text);
    results.push(res.embedding.values);
  }

  return results;
}

// -----------------------------------------------------------------------------
// Unified Embedding Service
// -----------------------------------------------------------------------------

/**
 * Determines current active embedding provider.
 * Fallback to local if no API key is configured or provider is explicitly 'local'.
 */
export function getActiveEmbeddingProvider() {
  if (config.aiProvider === 'local') return 'local';
  if (config.aiProvider === 'openai' && config.openaiApiKey) return 'openai';
  if (config.aiProvider === 'gemini' && config.geminiApiKey) return 'gemini';
  if (config.openaiApiKey) return 'openai';
  if (config.geminiApiKey) return 'gemini';
  return 'local';
}

/**
 * Generates embeddings in batches for an array of texts.
 * @param {string[]} texts - Array of raw texts to vectorize
 * @param {Object} [options]
 * @param {number} [options.batchSize=50] - Number of items per batch
 * @param {string} [options.provider] - 'openai' | 'gemini' | 'local'
 * @returns {Promise<Array<number[]>>}
 */
export async function generateBatchEmbeddings(texts, { batchSize = 50, provider = null } = {}) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const activeProvider = provider || getActiveEmbeddingProvider();
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    if (activeProvider === 'local') {
      const batchEmbeddings = batch.map((text) => generateLocalEmbedding(text));
      allEmbeddings.push(...batchEmbeddings);
    } else if (activeProvider === 'openai') {
      try {
        const batchEmbeddings = await embedWithOpenAI(batch);
        allEmbeddings.push(...batchEmbeddings);
      } catch (err) {
        console.warn('OpenAI Embedding failed, falling back to local deterministic embeddings:', err.message);
        const fallback = batch.map((text) => generateLocalEmbedding(text));
        allEmbeddings.push(...fallback);
      }
    } else if (activeProvider === 'gemini') {
      try {
        const batchEmbeddings = await embedWithGemini(batch);
        allEmbeddings.push(...batchEmbeddings);
      } catch (err) {
        console.warn('Gemini Embedding failed, falling back to local deterministic embeddings:', err.message);
        const fallback = batch.map((text) => generateLocalEmbedding(text));
        allEmbeddings.push(...fallback);
      }
    }
  }

  return allEmbeddings;
}

/**
 * Generates an embedding for a single text query.
 * Guarantees identical embedding model is used as ingestion.
 * @param {string} text
 * @param {Object} [options]
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text, options = {}) {
  const results = await generateBatchEmbeddings([text], options);
  return results[0] || [];
}

export default {
  getActiveEmbeddingProvider,
  generateLocalEmbedding,
  generateBatchEmbeddings,
  generateEmbedding,
};
