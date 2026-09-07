import express from 'express';
import { getRagOrchestrator } from '../core/rag.js';

const router = express.Router();

/**
 * POST /api/chat
 * Synchronous query pipeline endpoint for Question Answering with Vector Retrieval.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { query, question, session_id, sessionId, top_k, topK, threshold } = req.body;
    const userQuery = query || question;

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'The "query" field is required in request body.',
      });
    }

    const orchestrator = getRagOrchestrator();
    const result = await orchestrator.query({
      query: userQuery.trim(),
      sessionId: session_id || sessionId || null,
      topK: top_k || topK || undefined,
      threshold: threshold !== undefined ? Number(threshold) : undefined,
    });

    return res.status(200).json({
      success: true,
      answer: result.answer,
      citations: result.citations,
      session_id: result.sessionId,
      sessionId: result.sessionId,
      retrieved_chunks_count: result.retrievedChunksCount,
      retrieved_chunks: result.retrievedChunks,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
