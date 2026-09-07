import { v4 as uuidv4 } from 'uuid';
import config from '../config.js';
import { parseDocument, isSupportedFileType } from '../services/document.js';
import { chunkDocument } from '../services/chunking.js';
import { generateBatchEmbeddings, generateEmbedding } from '../services/embedding.js';
import { generateResponse, FALLBACK_MESSAGE } from '../services/llm.js';
import { getVectorStore } from '../database/vector_store.js';
import {
  createDocumentRecord,
  getAllDocuments,
  getDocumentById,
  deleteDocumentRecord,
  createSessionRecord,
  getAllSessions,
  getSessionById,
  createMessageRecord,
  getSessionMessages,
  getRecentConversationTurns,
  deleteSessionRecord,
} from '../database/relational.js';

export class RagOrchestrator {
  constructor() {
    this.vectorStore = getVectorStore();
  }

  // ---------------------------------------------------------------------------
  // Ingestion Pipeline
  // ---------------------------------------------------------------------------

  /**
   * Ingests a raw file (PDF/DOCX), parses text & pages, creates overlapping chunks,
   * generates vector embeddings, and persists to both Vector DB and Relational DB.
   * @param {Object} options
   * @param {string} options.filename - Original file name
   * @param {Buffer|string} options.source - File buffer or local file path
   * @param {string} [options.mimetype] - File MIME type
   * @param {number} [options.fileSize] - File size in bytes
   * @returns {Promise<object>}
   */
  async ingestDocument({ filename, source, mimetype = '', fileSize = 0 }) {
    if (!isSupportedFileType(filename, mimetype)) {
      throw new Error(`Unsupported file format for "${filename}". Supported formats: .pdf, .docx`);
    }

    const documentId = uuidv4();

    // 1. Extract text and page metadata
    const parsed = await parseDocument({ filename, source, mimetype });

    // 2. Chunk text while preserving page number metadata
    const chunks = chunkDocument({
      documentId,
      filename,
      pages: parsed.pages,
      chunkSize: config.chunkSize,
      overlap: config.chunkOverlap,
    });

    if (chunks.length === 0) {
      throw new Error(`No extractable text content found in "${filename}".`);
    }

    // 3. Generate embeddings in batches
    const chunkTexts = chunks.map((c) => c.text);
    const embeddings = await generateBatchEmbeddings(chunkTexts);

    // 4. Upsert vectors with rich metadata into Vector Database
    const vectorRecords = chunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: {
        document_id: documentId,
        documentId,
        filename,
        page_number: chunk.metadata.page_number,
        chunk_index: chunk.metadata.chunk_index,
        text: chunk.text,
      },
    }));

    await this.vectorStore.upsert(vectorRecords);

    // 5. Save document metadata in Relational Database
    const docRecord = await createDocumentRecord({
      id: documentId,
      filename,
      file_type: parsed.fileType,
      file_size: fileSize || (typeof source === 'string' ? 0 : source.length),
      chunk_count: chunks.length,
      page_count: parsed.pageCount,
    });

    return {
      success: true,
      documentId,
      filename,
      fileType: parsed.fileType,
      pageCount: parsed.pageCount,
      chunkCount: chunks.length,
      document: docRecord,
      message: `Successfully ingested "${filename}" with ${chunks.length} chunks across ${parsed.pageCount} page(s).`,
    };
  }

  /**
   * Deletes a document and cascades deletion to Vector Store and Relational DB.
   */
  async deleteDocument(documentId) {
    const doc = await getDocumentById(documentId);
    if (!doc) {
      return { success: false, message: 'Document not found' };
    }

    // Delete vectors from vector store
    await this.vectorStore.deleteByDocumentId(documentId);

    // Delete record from relational database
    await deleteDocumentRecord(documentId);

    return { success: true, message: `Document "${doc.filename}" and its vector indices have been deleted.` };
  }

  // ---------------------------------------------------------------------------
  // Query Pipeline
  // ---------------------------------------------------------------------------

  /**
   * Executes synchronous query pipeline with semantic retrieval,
   * threshold filtering, history injection, anti-hallucination guard, and citation extraction.
   * @param {Object} options
   * @param {string} options.query - User's question
   * @param {string} [options.sessionId] - Session ID for conversation continuity
   * @param {number} [options.topK] - Number of chunks to retrieve
   * @param {number} [options.threshold] - Cosine similarity confidence threshold
   * @returns {Promise<object>}
   */
  async query({
    query,
    sessionId = null,
    topK = config.topK,
    threshold = config.similarityThreshold,
  }) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query string is required.');
    }

    const cleanQuery = query.trim();

    // 1. Ensure or initialize session in Relational DB
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      const autoTitle = cleanQuery.length > 40 ? `${cleanQuery.slice(0, 37)}...` : cleanQuery;
      await createSessionRecord(currentSessionId, autoTitle);
    } else {
      const existingSession = await getSessionById(currentSessionId);
      if (!existingSession) {
        await createSessionRecord(currentSessionId, 'New Conversation');
      }
    }

    // 2. Vectorize user query using the identical embedding model
    const queryVector = await generateEmbedding(cleanQuery);

    // 3. Execute semantic similarity search in Vector DB
    const retrievedChunks = await this.vectorStore.query({
      vector: queryVector,
      topK,
      threshold,
    });

    let answer = '';
    let citations = [];

    // 4. Anti-Hallucination Guard: If 0 chunks survive threshold, bypass LLM
    if (!retrievedChunks || retrievedChunks.length === 0) {
      answer = FALLBACK_MESSAGE;
      citations = [];
    } else {
      // 5. Fetch prior conversation history from Relational DB for pronoun/context continuity
      const history = await getRecentConversationTurns(currentSessionId, 4);

      // 6. Assemble prompt and generate answer via LLM with strict context grounding
      const response = await generateResponse({
        query: cleanQuery,
        contextChunks: retrievedChunks,
        history,
      });

      answer = response.answer;
      citations = response.citations;
    }

    // 7. Persist chat turns to Relational DB
    const userMessageId = uuidv4();
    const assistantMessageId = uuidv4();

    await createMessageRecord({
      id: userMessageId,
      sessionId: currentSessionId,
      role: 'user',
      content: cleanQuery,
      citations: [],
    });

    await createMessageRecord({
      id: assistantMessageId,
      sessionId: currentSessionId,
      role: 'assistant',
      content: answer,
      citations,
    });

    return {
      answer,
      citations,
      sessionId: currentSessionId,
      session_id: currentSessionId,
      retrievedChunksCount: retrievedChunks ? retrievedChunks.length : 0,
      retrievedChunks: (retrievedChunks || []).map((c) => ({
        id: c.id,
        score: Number(c.score.toFixed(4)),
        filename: c.metadata.filename,
        page_number: c.metadata.page_number,
        text: c.metadata.text,
      })),
    };
  }
}

// Singleton instance
let orchestratorInstance = null;

export function getRagOrchestrator() {
  if (!orchestratorInstance) {
    orchestratorInstance = new RagOrchestrator();
  }
  return orchestratorInstance;
}

export default getRagOrchestrator;
