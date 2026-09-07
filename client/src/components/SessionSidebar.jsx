import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Search, Sparkles, BookOpen } from 'lucide-react';

export function SessionSidebar({
  sessions = [],
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter((s) =>
    (s.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="sidebar">
      {/* New Chat Button */}
      <div style={{ padding: '20px 16px 12px' }}>
        <button
          onClick={onNewSession}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '12px 18px',
            background: 'var(--gradient-brand)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
          }}
        >
          <Plus size={18} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Sessions List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            fontWeight: 600,
            padding: '8px 8px 4px',
          }}
        >
          Recent Sessions ({filteredSessions.length})
        </div>

        {filteredSessions.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            No conversations found.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: '1px solid ' + (isActive ? 'rgba(99, 102, 241, 0.35)' : 'transparent'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  group: 'session-item',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <MessageSquare
                    size={16}
                    color={isActive ? '#818cf8' : 'var(--text-muted)'}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '190px',
                      }}
                    >
                      {session.title || 'Untitled Chat'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {session.message_count || 0} messages
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Delete conversation"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isActive ? 1 : 0.6,
                    transition: 'opacity 0.2s, color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f43f5e')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <BookOpen size={14} color="#818cf8" />
        <span>RAG Grounding Active</span>
      </div>
    </aside>
  );
}

export default SessionSidebar;
