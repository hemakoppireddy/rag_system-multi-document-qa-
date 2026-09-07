import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllSessions,
  getSessionById,
  createSessionRecord,
  updateSessionTitle,
  deleteSessionRecord,
  getSessionMessages,
} from '../database/relational.js';

const router = express.Router();

/**
 * GET /api/sessions
 * List all chat sessions with message counts.
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await getAllSessions();
    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sessions
 * Create a new chat session.
 */
router.post('/sessions', async (req, res, next) => {
  try {
    const { title } = req.body;
    const id = uuidv4();
    const session = await createSessionRecord(id, title || 'New Conversation');
    return res.status(201).json({
      success: true,
      session,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sessions/:id
 * Get session details and sequential message history.
 */
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const messages = await getSessionMessages(req.params.id);
    return res.status(200).json({
      success: true,
      session,
      messages,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/sessions/:id
 * Update session title.
 */
router.patch('/sessions/:id', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const session = await updateSessionTitle(req.params.id, title.trim());
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    return res.status(200).json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/sessions/:id
 * Delete a session and all its messages.
 */
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const deleted = await deleteSessionRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    return res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
