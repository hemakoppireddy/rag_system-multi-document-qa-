import fs from 'fs';
import path from 'path';
import config from '../config.js';

// -----------------------------------------------------------------------------
// Vector Math Utilities
// -----------------------------------------------------------------------------

export function dotProduct(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(a) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return 0;
  }
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dotProduct(a, b) / (magA * magB);
}

// -----------------------------------------------------------------------------
// Persistent In-Memory Vector Store
// -----------------------------------------------------------------------------

export class PersistentVectorStore {
  constructor(storagePath = config.vectorStorePath) {
    this.storagePath = storagePath;
    this.vectors = new Map(); // id -> { id, values, metadata, norm }
    this.isLoaded = false;
  }

  async init() {
    if (this.isLoaded) return;

    if (this.storagePath && fs.existsSync(this.storagePath)) {
      try {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const item of data) {
            const norm = magnitude(item.values);
            this.vectors.set(item.id, {
              id: item.id,
              values: item.values,
              metadata: item.metadata || {},
              norm,
            });
          }
        }
      } catch (err) {
        console.error('Error loading persistent vector store:', err);
      }
    }
    this.isLoaded = true;
  }

  async save() {
    if (!this.storagePath) return;

    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serializable = Array.from(this.vectors.values()).map(({ id, values, metadata }) => ({
      id,
      values,
      metadata,
    }));

    fs.writeFileSync(this.storagePath, JSON.stringify(serializable, null, 2), 'utf8');
  }

  /**
   * Upsert an array of vector records.
   * @param {Array<{ id: string, values: number[], metadata: object }>} records
   */
  async upsert(records) {
    await this.init();
    if (!Array.isArray(records)) {
      records = [records];
    }

    for (const record of records) {
      if (!record.id || !record.values || !Array.isArray(record.values)) {
        throw new Error('Invalid vector record: must include id and numeric values array');
      }
      const norm = magnitude(record.values);
      this.vectors.set(record.id, {
        id: record.id,
        values: record.values,
        metadata: record.metadata || {},
        norm,
      });
    }

    await this.save();
    return { upsertedCount: records.length };
  }

  /**
   * Query nearest vectors by cosine similarity.
   * @param {Object} options
   * @param {number[]} options.vector - Query embedding vector
   * @param {number} [options.topK=5] - Number of top results to return
   * @param {number} [options.threshold=0.65] - Minimum cosine similarity threshold
   * @param {Object} [options.filter] - Optional metadata filter criteria
   * @returns {Promise<Array<{ id: string, score: number, metadata: object }>>}
   */
  async query({ vector, topK = config.topK, threshold = config.similarityThreshold, filter = null }) {
    await this.init();
    if (!vector || !Array.isArray(vector)) {
      throw new Error('Query vector must be a valid numeric array');
    }

    const queryMag = magnitude(vector);
    if (queryMag === 0) return [];

    const scored = [];

    for (const item of this.vectors.values()) {
      // Optional metadata filter
      if (filter) {
        let match = true;
        for (const [key, val] of Object.entries(filter)) {
          if (item.metadata[key] !== val) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      if (item.norm === 0) continue;
      const dot = dotProduct(vector, item.values);
      const score = dot / (queryMag * item.norm);

      // Threshold filtering: only accept candidates >= threshold
      if (score >= threshold) {
        scored.push({
          id: item.id,
          score,
          metadata: item.metadata,
        });
      }
    }

    // Sort descending by similarity score and take topK
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Delete all chunks associated with a given documentId.
   */
  async deleteByDocumentId(documentId) {
    await this.init();
    let deletedCount = 0;

    for (const [id, item] of this.vectors.entries()) {
      if (item.metadata && (item.metadata.document_id === documentId || item.metadata.documentId === documentId)) {
        this.vectors.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await this.save();
    }
    return { deletedCount };
  }

  async count() {
    await this.init();
    return this.vectors.size;
  }

  async clear() {
    this.vectors.clear();
    await this.save();
  }
}

// -----------------------------------------------------------------------------
// Vector Store Factory / Singleton
// -----------------------------------------------------------------------------

let vectorStoreInstance = null;

export function getVectorStore() {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new PersistentVectorStore();
  }
  return vectorStoreInstance;
}

export default getVectorStore;
