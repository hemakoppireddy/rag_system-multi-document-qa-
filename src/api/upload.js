import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config.js';
import { getRagOrchestrator } from '../core/rag.js';
import { getAllDocuments, getDocumentById } from '../database/relational.js';

const router = express.Router();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.memoryStorage(); // Store in memory buffer for fast processing
const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || ext === '.docx') {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.originalname}. Only .pdf and .docx files are permitted.`));
    }
  },
});

/**
 * POST /api/upload
 * Ingest one or multiple PDF / DOCX documents.
 */
router.post('/upload', upload.any(), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided. Please upload at least one .pdf or .docx file under form field "files" or "file".',
      });
    }

    const orchestrator = getRagOrchestrator();
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await orchestrator.ingestDocument({
          filename: file.originalname,
          source: file.buffer,
          mimetype: file.mimetype,
          fileSize: file.size,
        });
        results.push(result);
      } catch (err) {
        errors.push({
          filename: file.originalname,
          error: err.message,
        });
      }
    }

    if (results.length === 0 && errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: 'Failed to process uploaded file(s).',
        errors,
      });
    }

    return res.status(200).json({
      success: true,
      documentsProcessed: results.length,
      documents_processed: results.length,
      documents: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${results.length} document(s).`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents
 * List all ingested documents and their metadata.
 */
router.get('/documents', async (req, res, next) => {
  try {
    const documents = await getAllDocuments();
    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/documents/:id
 * Get single document details.
 */
router.get('/documents/:id', async (req, res, next) => {
  try {
    const doc = await getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    return res.status(200).json({ success: true, document: doc });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/documents/:id
 * Delete document and cascade to vector store and relational db.
 */
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const orchestrator = getRagOrchestrator();
    const result = await orchestrator.deleteDocument(req.params.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
