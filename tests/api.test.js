import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import app from '../src/index.js';
import { getDatabase, closeDatabase } from '../src/database/relational.js';
import { getVectorStore } from '../src/database/vector_store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

describe('REST API Integration Tests', () => {
  let uploadedDocId = null;
  let activeSessionId = null;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await getDatabase();
    const vs = getVectorStore();
    await vs.init();
  });

  afterAll(() => {
    closeDatabase();
  });

  describe('GET /api/health', () => {
    test('should return 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.stats).toBeDefined();
    });
  });

  describe('POST /api/upload', () => {
    test('should upload and ingest a PDF document', async () => {
      const pdfPath = path.join(fixturesDir, 'employee_handbook.pdf');
      const res = await request(app)
        .post('/api/upload')
        .attach('files', pdfPath);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.documentsProcessed).toBe(1);
      expect(res.body.documents[0].filename).toBe('employee_handbook.pdf');
      expect(res.body.documents[0].pageCount).toBe(2);

      uploadedDocId = res.body.documents[0].documentId;
    });

    test('should reject requests with no files', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/documents', () => {
    test('should list uploaded documents', async () => {
      const res = await request(app).get('/api/documents');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.documents)).toBe(true);
      expect(res.body.documents.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/chat', () => {
    test('should answer query and return session_id and citations', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({
          query: 'How many days of PTO do employees receive?',
          threshold: 0.1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.answer).toBeDefined();
      expect(res.body.citations).toBeDefined();
      expect(res.body.session_id).toBeDefined();

      activeSessionId = res.body.session_id;
    });

    test('should reject query request with missing body', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Sessions Management APIs', () => {
    test('GET /api/sessions should list sessions', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessions.length).toBeGreaterThan(0);
    });

    test('GET /api/sessions/:id should return conversation history', async () => {
      const res = await request(app).get(`/api/sessions/${activeSessionId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messages.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    test('should delete document and return success', async () => {
      if (uploadedDocId) {
        const res = await request(app).delete(`/api/documents/${uploadedDocId}`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });
  });
});
