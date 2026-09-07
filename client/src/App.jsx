import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SessionSidebar from './components/SessionSidebar';
import ChatInterface from './components/ChatInterface';
import DocumentManager from './components/DocumentManager';
import SourceModal from './components/SourceModal';
import {
  fetchHealth,
  fetchDocuments,
  uploadDocuments,
  deleteDocument,
  fetchSessions,
  createSession,
  fetchSessionMessages,
  deleteSession,
  sendChatMessage,
} from './services/api';

export function App() {
  const [health, setHealth] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [inspectingSource, setInspectingSource] = useState(null); // { citation, chunk }

  // Initial Data Fetch
  useEffect(() => {
    loadHealth();
    loadDocuments();
    loadSessions();
  }, []);

  // When active session changes, load its messages
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const loadHealth = async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load health:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await fetchSessions();
      const sessionList = data.sessions || [];
      setSessions(sessionList);
      if (sessionList.length > 0 && !activeSessionId) {
        setActiveSessionId(sessionList[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadMessages = async (sessionId) => {
    try {
      const data = await fetchSessionMessages(sessionId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages for session:', err);
    }
  };

  const handleNewSession = async () => {
    try {
      const res = await createSession('New Conversation');
      if (res.session) {
        setSessions((prev) => [res.session, ...prev]);
        setActiveSessionId(res.session.id);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleSendMessage = async (queryText) => {
    if (!queryText.trim()) return;

    // Optimistically add user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: queryText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await sendChatMessage({
        query: queryText,
        sessionId: activeSessionId,
      });

      if (res.session_id && res.session_id !== activeSessionId) {
        setActiveSessionId(res.session_id);
      }

      // Add assistant response
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        citations: res.citations || [],
        retrieved_chunks: res.retrieved_chunks || [],
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      loadSessions(); // refresh session list with last message
      loadHealth();
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err.message || 'Failed to generate response'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDocuments = async (files) => {
    const res = await uploadDocuments(files);
    await loadDocuments();
    await loadHealth();
    return res;
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await deleteDocument(docId);
      await loadDocuments();
      await loadHealth();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleInspectCitation = (citation, retrievedChunks = []) => {
    const matchingChunk = (retrievedChunks || []).find(
      (c) => c.filename === citation.document_name && c.page_number === citation.page_number
    );
    setInspectingSource({ citation, chunk: matchingChunk });
  };

  return (
    <div className="app-container">
      {/* Session Sidebar */}
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* Main Chat View */}
      <div className="main-content">
        <Header
          health={health}
          onToggleDocs={() => setShowDocs(!showDocs)}
          showDocs={showDocs}
          docCount={documents.length}
        />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onInspectCitation={handleInspectCitation}
          />
        </div>
      </div>

      {/* Document Library Drawer */}
      {showDocs && (
        <DocumentManager
          documents={documents}
          onUpload={handleUploadDocuments}
          onDeleteDocument={handleDeleteDocument}
          onClose={() => setShowDocs(false)}
        />
      )}

      {/* Citation Source Inspector Modal */}
      {inspectingSource && (
        <SourceModal
          citation={inspectingSource.citation}
          sourceChunk={inspectingSource.chunk}
          onClose={() => setInspectingSource(null)}
        />
      )}
    </div>
  );
}

export default App;
