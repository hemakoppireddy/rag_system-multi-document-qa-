import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import CitationBadge from './CitationBadge';
import TestPlayground from './TestPlayground';

export function ChatInterface({
  messages = [],
  isLoading,
  onSendMessage,
  onInspectCitation,
}) {
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    onSendMessage(inputQuery.trim());
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaInput = (e) => {
    setInputQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleSelectScenario = (promptText) => {
    setInputQuery(promptText);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Message Viewport */}
      <div className="chat-viewport">
        {messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 'auto 0',
              textAlign: 'center',
              maxWidth: '680px',
              alignSelf: 'center',
              padding: '40px 20px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'var(--gradient-brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Bot size={36} />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: '10px',
              }}
            >
              Ask Anything About Your Documents
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '24px',
              }}
            >
              Upload PDF or DOCX files to get grounded, verifiable answers with exact page citations and zero hallucinations.
            </p>

            <TestPlayground onSelectPrompt={handleSelectScenario} />
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const citations = Array.isArray(msg.citations) ? msg.citations : [];
            const isFallback = msg.content === 'I could not find an answer in the provided documents.';

            return (
              <div key={msg.id || index} className={`message-row ${msg.role}`}>
                <div className={`avatar ${msg.role}`}>
                  {isUser ? <User size={18} /> : <Bot size={18} />}
                </div>

                <div className="message-bubble">
                  {/* Fallback Graceful Failure Warning Banner */}
                  {isFallback && !isUser && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        marginBottom: '10px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fbbf24',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      <AlertTriangle size={15} />
                      <span>Strict Anti-Hallucination Guard Triggered (0 relevant chunks)</span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      color: isUser ? '#ffffff' : isFallback ? '#e2e8f0' : '#f1f5f9',
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Citations Array */}
                  {citations.length > 0 && !isUser && (
                    <div className="citation-container">
                      <span className="citation-label">Sources:</span>
                      {citations.map((cit, citIdx) => (
                        <CitationBadge
                          key={`${cit.document_name || citIdx}-${cit.page_number || citIdx}`}
                          citation={cit}
                          onClick={() => onInspectCitation(cit, msg.retrieved_chunks)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="message-row assistant">
            <div className="avatar assistant">
              <Bot size={18} />
            </div>
            <div
              className="message-bubble"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-secondary)',
              }}
            >
              <Loader2 size={18} className="animate-spin" color="var(--accent-primary)" />
              <span style={{ fontSize: '0.9rem' }}>Retrieving vectors & synthesizing response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Query Prompt Input Bar */}
      <div className="input-area-wrapper">
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <textarea
              ref={textareaRef}
              className="chat-input"
              rows={1}
              placeholder="Ask a question about your uploaded documents..."
              value={inputQuery}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!inputQuery.trim() || isLoading}
              title="Send question"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '8px',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={13} color="#10b981" /> Hallucination Guard Active
          </span>
          <span>•</span>
          <span>Shift + Enter for new line</span>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
