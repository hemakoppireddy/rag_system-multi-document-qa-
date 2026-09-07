import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import config from '../config.js';

let SQL = null;
let dbInstance = null;
let currentDbPath = config.databasePath;

/**
 * Initializes the SQLite WebAssembly engine and loads or creates the database file.
 * @param {string} [dbPath]
 * @returns {Promise<any>}
 */
export async function getDatabase(dbPath = config.databasePath) {
  if (dbInstance && currentDbPath === dbPath) {
    return dbInstance;
  }

  currentDbPath = dbPath;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
    initSchema(dbInstance);
    saveDatabase(dbInstance, dbPath);
  }

  initSchema(dbInstance);
  return dbInstance;
}

export function saveDatabase(db = dbInstance, dbPath = currentDbPath) {
  if (!db || !dbPath) return;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const binaryArray = db.export();
  const buffer = Buffer.from(binaryArray);
  fs.writeFileSync(dbPath, buffer);
}

export function initSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL DEFAULT 0,
      page_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      citations TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  `);
}

// -----------------------------------------------------------------------------
// Document Management
// -----------------------------------------------------------------------------

export async function createDocumentRecord(doc) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO documents (id, filename, file_type, file_size, chunk_count, page_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      doc.id,
      doc.filename,
      doc.file_type || doc.fileType,
      doc.file_size || doc.fileSize,
      doc.chunk_count ?? doc.chunkCount ?? 0,
      doc.page_count ?? doc.pageCount ?? 1,
      now,
    ]
  );
  saveDatabase(db);
  return getDocumentById(doc.id);
}

export async function getAllDocuments() {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM documents ORDER BY created_at DESC`);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export async function getDocumentById(id) {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM documents WHERE id = ?`);
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export async function deleteDocumentRecord(id) {
  const db = await getDatabase();
  db.run(`DELETE FROM documents WHERE id = ?`, [id]);
  saveDatabase(db);
  return true;
}

// -----------------------------------------------------------------------------
// Session Management
// -----------------------------------------------------------------------------

export async function createSessionRecord(id, title = 'New Conversation') {
  const db = await getDatabase();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO sessions (id, title, created_at, updated_at)
     VALUES (?, ?, ?, ?)`,
    [id, title, now, now]
  );
  saveDatabase(db);
  return getSessionById(id);
}

export async function getAllSessions() {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) as message_count,
      (SELECT content FROM messages m WHERE m.session_id = s.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM sessions s 
    ORDER BY s.updated_at DESC
  `);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export async function getSessionById(id) {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM sessions WHERE id = ?`);
  stmt.bind([id]);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export async function updateSessionTitle(id, title) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  db.run(`UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?`, [title, now, id]);
  saveDatabase(db);
  return getSessionById(id);
}

export async function touchSession(id) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  db.run(`UPDATE sessions SET updated_at = ? WHERE id = ?`, [now, id]);
  saveDatabase(db);
}

export async function deleteSessionRecord(id) {
  const db = await getDatabase();
  db.run(`DELETE FROM messages WHERE session_id = ?`, [id]);
  db.run(`DELETE FROM sessions WHERE id = ?`, [id]);
  saveDatabase(db);
  return true;
}

// -----------------------------------------------------------------------------
// Message Management
// -----------------------------------------------------------------------------

export async function createMessageRecord({ id, sessionId, role, content, citations = [] }) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const citationsJson = typeof citations === 'string' ? citations : JSON.stringify(citations);

  db.run(
    `INSERT INTO messages (id, session_id, role, content, citations, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, sessionId, role, content, citationsJson, now]
  );
  await touchSession(sessionId);
  saveDatabase(db);
  return getMessageById(id);
}

export async function getMessageById(id) {
  const db = await getDatabase();
  const stmt = db.prepare(`SELECT * FROM messages WHERE id = ?`);
  stmt.bind([id]);
  let msg = null;
  if (stmt.step()) {
    msg = stmt.getAsObject();
    if (msg && msg.citations) {
      try {
        msg.citations = JSON.parse(msg.citations);
      } catch {
        msg.citations = [];
      }
    }
  }
  stmt.free();
  return msg;
}

export async function getSessionMessages(sessionId, limit = 50) {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM messages 
    WHERE session_id = ? 
    ORDER BY created_at ASC 
    LIMIT ?
  `);
  stmt.bind([sessionId, limit]);
  const messages = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    try {
      row.citations = JSON.parse(row.citations || '[]');
    } catch {
      row.citations = [];
    }
    messages.push(row);
  }
  stmt.free();
  return messages;
}

export async function getRecentConversationTurns(sessionId, turnPairsLimit = 5) {
  const db = await getDatabase();
  const stmt = db.prepare(`
    SELECT role, content FROM (
      SELECT role, content, created_at 
      FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    ) ORDER BY created_at ASC
  `);
  stmt.bind([sessionId, turnPairsLimit * 2]);
  const messages = [];
  while (stmt.step()) {
    messages.push(stmt.getAsObject());
  }
  stmt.free();
  return messages;
}

export function closeDatabase() {
  if (dbInstance) {
    saveDatabase(dbInstance);
    dbInstance.close();
    dbInstance = null;
  }
}

export default {
  getDatabase,
  saveDatabase,
  initSchema,
  createDocumentRecord,
  getAllDocuments,
  getDocumentById,
  deleteDocumentRecord,
  createSessionRecord,
  getAllSessions,
  getSessionById,
  updateSessionTitle,
  touchSession,
  deleteSessionRecord,
  createMessageRecord,
  getMessageById,
  getSessionMessages,
  getRecentConversationTurns,
  closeDatabase,
};
