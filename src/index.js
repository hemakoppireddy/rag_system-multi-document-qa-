import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config.js';
import uploadRouter from './api/upload.js';
import chatRouter from './api/chat.js';
import sessionsRouter from './api/sessions.js';
import { getVectorStore } from './database/vector_store.js';
import { getDatabase, getAllDocuments, getAllSessions } from './database/relational.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', uploadRouter);
app.use('/api', chatRouter);
app.use('/api', sessionsRouter);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const vectorStore = getVectorStore();
    const vectorCount = await vectorStore.count();
    const documents = await getAllDocuments();
    const sessions = await getAllSessions();

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      provider: config.aiProvider,
      models: {
        llm: config.llmModel,
        embedding: config.embeddingModel,
      },
      stats: {
        documentsCount: documents.length,
        indexedVectorsCount: vectorCount,
        activeSessionsCount: sessions.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// Serve frontend static assets if built
const clientDistPath = path.join(rootDir, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });
});

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(config.port, async () => {
    // Initialize DB on boot
    try {
      await getDatabase();
      const vectorStore = getVectorStore();
      await vectorStore.init();
      console.log(`====================================================`);
      console.log(`🚀 Multi-Document RAG QA System running on port ${config.port}`);
      console.log(`📡 Provider: ${config.aiProvider.toUpperCase()}`);
      console.log(`🧠 LLM: ${config.llmModel} | Embedding: ${config.embeddingModel}`);
      console.log(`🌐 Server URL: http://localhost:${config.port}`);
      console.log(`====================================================`);
    } catch (err) {
      console.error('Failed to initialize database on startup:', err);
    }
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing server.');
    server.close(() => {
      console.log('HTTP server closed.');
    });
  });
}

export default app;
