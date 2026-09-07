import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: path.join(rootDir, '.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  rootDir,

  // AI & Embeddings
  aiProvider: process.env.AI_PROVIDER || 'openai', // 'openai' | 'gemini' | 'local'
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',

  // Vector DB
  vectorDbType: process.env.VECTOR_DB_TYPE || 'local', // 'local' | 'qdrant' | 'chroma' | 'pinecone'
  vectorStorePath: path.resolve(rootDir, process.env.VECTOR_STORE_PATH || './data/vector_store.json'),
  vectorCollectionName: process.env.VECTOR_COLLECTION_NAME || 'rag_documents',
  vectorDbUrl: process.env.VECTOR_DB_URL || 'http://localhost:6333',
  vectorDbApiKey: process.env.VECTOR_DB_API_KEY || '',
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.65'),
  topK: parseInt(process.env.TOP_K || '5', 10),

  // Chunking
  chunkSize: parseInt(process.env.CHUNK_SIZE || '800', 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '150', 10),

  // Relational DB
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || './data/rag_history.db'),

  // Uploads
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || './uploads'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
};

export default config;
