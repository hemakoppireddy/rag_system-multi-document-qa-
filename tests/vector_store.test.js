import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  cosineSimilarity,
  dotProduct,
  magnitude,
  PersistentVectorStore,
} from '../src/database/vector_store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.join(__dirname, 'temp_test_vector_store.json');

describe('Vector Store and Similarity Math', () => {
  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Vector Math', () => {
    test('should calculate dot product correctly', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(dotProduct(a, b)).toBe(4 + 10 + 18); // 32
    });

    test('should calculate magnitude correctly', () => {
      const a = [3, 4];
      expect(magnitude(a)).toBe(5);
    });

    test('should calculate cosine similarity between identical and orthogonal vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];

      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
      expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0, 5);
    });
  });

  describe('PersistentVectorStore Operations', () => {
    test('should upsert, query with threshold, and rank results by score', async () => {
      const store = new PersistentVectorStore(testDbPath);

      await store.upsert([
        {
          id: 'chunk-1',
          values: [1.0, 0.0, 0.0],
          metadata: { document_id: 'doc-1', filename: 'doc1.pdf', page_number: 1, text: 'PTO policy text' },
        },
        {
          id: 'chunk-2',
          values: [0.8, 0.6, 0.0],
          metadata: { document_id: 'doc-1', filename: 'doc1.pdf', page_number: 2, text: 'Remote work text' },
        },
        {
          id: 'chunk-3',
          values: [0.0, 1.0, 0.0],
          metadata: { document_id: 'doc-2', filename: 'doc2.docx', page_number: 1, text: 'Contractor text' },
        },
      ]);

      expect(await store.count()).toBe(3);

      // Query close to [1.0, 0.0, 0.0]
      const results = await store.query({
        vector: [1.0, 0.0, 0.0],
        topK: 5,
        threshold: 0.5,
      });

      expect(results.length).toBe(2); // chunk-1 (score 1.0) and chunk-2 (score 0.8), chunk-3 (0.0) is below 0.5 threshold
      expect(results[0].id).toBe('chunk-1');
      expect(results[0].score).toBeCloseTo(1.0, 4);
      expect(results[1].id).toBe('chunk-2');
      expect(results[1].score).toBeCloseTo(0.8, 4);
    });

    test('should filter out results below similarity threshold', async () => {
      const store = new PersistentVectorStore(testDbPath);

      await store.upsert([
        {
          id: 'chunk-a',
          values: [0.2, 0.1, 0.0],
          metadata: { document_id: 'doc-1', filename: 'doc1.pdf', page_number: 1, text: 'Low similarity item' },
        },
      ]);

      const results = await store.query({
        vector: [0.0, 0.0, 1.0], // Orthogonal query
        topK: 5,
        threshold: 0.7,
      });

      expect(results).toEqual([]);
    });

    test('should delete vectors by document_id', async () => {
      const store = new PersistentVectorStore(testDbPath);

      await store.upsert([
        {
          id: 'c1',
          values: [1, 0, 0],
          metadata: { document_id: 'doc-to-delete', filename: 'a.pdf', page_number: 1 },
        },
        {
          id: 'c2',
          values: [0, 1, 0],
          metadata: { document_id: 'doc-to-keep', filename: 'b.pdf', page_number: 1 },
        },
      ]);

      expect(await store.count()).toBe(2);

      const deleteRes = await store.deleteByDocumentId('doc-to-delete');
      expect(deleteRes.deletedCount).toBe(1);
      expect(await store.count()).toBe(1);
    });

    test('should persist data to disk and reload in new instance', async () => {
      const store1 = new PersistentVectorStore(testDbPath);
      await store1.upsert([
        {
          id: 'persisted-1',
          values: [0.6, 0.8],
          metadata: { filename: 'test.pdf', page_number: 1 },
        },
      ]);

      // Create new instance pointing to same file
      const store2 = new PersistentVectorStore(testDbPath);
      await store2.init();
      expect(await store2.count()).toBe(1);

      const res = await store2.query({ vector: [0.6, 0.8], topK: 1 });
      expect(res[0].id).toBe('persisted-1');
    });
  });
});
