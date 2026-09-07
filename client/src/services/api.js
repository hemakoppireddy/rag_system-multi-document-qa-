const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocuments(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to upload documents');
  }
  return data;
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete document');
  return res.json();
}

export async function fetchSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function createSession(title = 'New Conversation') {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create session');
  return res.json();
}

export async function fetchSessionMessages(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch session messages');
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete session');
  return res.json();
}

export async function sendChatMessage({ query, sessionId, topK, threshold }) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      session_id: sessionId,
      top_k: topK,
      threshold,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Failed to query chat endpoint');
  }
  return data;
}

export default {
  fetchHealth,
  fetchDocuments,
  uploadDocuments,
  deleteDocument,
  fetchSessions,
  createSession,
  fetchSessionMessages,
  deleteSession,
  sendChatMessage,
};
