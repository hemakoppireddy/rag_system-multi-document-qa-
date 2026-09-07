import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { RagOrchestrator } from '../src/core/rag.js';
import { PersistentVectorStore } from '../src/database/vector_store.js';
import { getDatabase, closeDatabase } from '../src/database/relational.js';
import { FALLBACK_MESSAGE } from '../src/services/llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

const testDbPath = path.join(__dirname, 'temp_test_rag.db');
const testVectorPath = path.join(__dirname, 'temp_test_rag_vectors.json');

describe('RAG Orchestrator & End-to-End Scenarios', () => {
  let orchestrator;
  let pdfDocId;
  let docxDocId;

  beforeAll(async () => {
    // Initialize clean test DBs
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(testVectorPath)) fs.unlinkSync(testVectorPath);

    await getDatabase(testDbPath);
    const vectorStore = new PersistentVectorStore(testVectorPath);
    orchestrator = new RagOrchestrator();
    orchestrator.vectorStore = vectorStore;

    // Ingest employee_handbook.pdf (2 pages)
    const pdfPath = path.join(fixturesDir, 'employee_handbook.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfRes = await orchestrator.ingestDocument({
      filename: 'employee_handbook.pdf',
      source: pdfBuffer,
      mimetype: 'application/pdf',
      fileSize: pdfBuffer.length,
    });
    pdfDocId = pdfRes.documentId;

    // Ingest contractor_guidelines.docx
    const docxPath = path.join(fixturesDir, 'contractor_guidelines.docx');
    const docxBuffer = fs.readFileSync(docxPath);
    const docxRes = await orchestrator.ingestDocument({
      filename: 'contractor_guidelines.docx',
      source: docxBuffer,
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: docxBuffer.length,
    });
    docxDocId = docxRes.documentId;
  });

  afterAll(() => {
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(testVectorPath)) fs.unlinkSync(testVectorPath);
  });

  describe('Scenario 1: Fact Retrieval & Accurate Citations', () => {
    test('should answer PTO query and cite employee_handbook.pdf Page 1', async () => {
      const response = await orchestrator.query({
        query: 'How much paid time off PTO do full-time employees receive per year?',
        threshold: 0.1, // Using low threshold for deterministic local embeddings
      });

      expect(response.answer).toBeDefined();
      expect(response.answer).not.toBe(FALLBACK_MESSAGE);
      expect(response.answer.toLowerCase()).toContain('20 days');
      expect(Array.isArray(response.citations)).toBe(true);
      expect(response.citations.length).toBeGreaterThan(0);

      const hasHandbookCitation = response.citations.some(
        (c) => c.document_name === 'employee_handbook.pdf' && c.page_number === 1
      );
      expect(hasHandbookCitation).toBe(true);
    });
  });

  describe('Scenario 2: Multi-Document Cross-Synthesis', () => {
    test('should synthesize employee PTO vs contractor benefits with dual citations', async () => {
      const response = await orchestrator.query({
        query: 'Compare PTO paid time off for employees versus contractors compensation',
        threshold: 0.05,
      });

      expect(response.answer).toBeDefined();
      expect(response.answer).not.toBe(FALLBACK_MESSAGE);

      const citedDocs = response.citations.map((c) => c.document_name);
      expect(citedDocs).toContain('employee_handbook.pdf');
      expect(citedDocs).toContain('contractor_guidelines.docx');
    });
  });

  describe('Scenario 3: Conversational Follow-up & Pronoun Resolution', () => {
    test('should maintain session state across sequential turns', async () => {
      // Turn 1
      const turn1 = await orchestrator.query({
        query: 'How much PTO do employees get?',
        threshold: 0.1,
      });

      const sessionId = turn1.sessionId;
      expect(sessionId).toBeDefined();

      // Turn 2: Follow-up using pronoun "they"
      const turn2 = await orchestrator.query({
        query: 'Can they carry over unused days into the next calendar year?',
        sessionId,
        threshold: 0.1,
      });

      expect(turn2.sessionId).toBe(sessionId);
      expect(turn2.answer.toLowerCase()).toContain('5 days');
      expect(turn2.citations.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario 4: Anti-Hallucination & Graceful Fallback', () => {
    test('should return deterministic fallback when asking out-of-scope questions', async () => {
      const response = await orchestrator.query({
        query: 'What is the capital of France and what is the population of Paris?',
        threshold: 0.65, // Standard confidence threshold
      });

      expect(response.answer).toBe(FALLBACK_MESSAGE);
      expect(response.citations).toEqual([]);
      expect(response.retrievedChunksCount).toBe(0);
    });
  });
});
