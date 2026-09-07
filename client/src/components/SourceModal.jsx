import React from 'react';
import { X, FileText, CheckCircle2, Bookmark, Shield } from 'lucide-react';

export function SourceModal({ citation, sourceChunk, onClose }) {
  if (!citation && !sourceChunk) return null;

  const docName = citation?.document_name || sourceChunk?.filename || 'Document';
  const pageNum = citation?.page_number || sourceChunk?.page_number || 1;
  const score = sourceChunk?.score !== undefined ? `${(sourceChunk.score * 100).toFixed(1)}% Match` : null;
  const snippet = sourceChunk?.text || 'Source verified from document embeddings index.';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeInMessage 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          width: '560px',
          maxWidth: '100%',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Bookmark size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>Verified Citation Source</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Exact context chunk retrieved from Vector Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Metadata Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Document
              </div>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {docName}
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Page / Block
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#a5b4fc', marginTop: '2px' }}>
                Page {pageNum}
              </div>
            </div>

            {score && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Similarity
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
                  {score}
                </div>
              </div>
            )}
          </div>

          {/* Context Snippet */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Source Text Excerpt
            </div>
            <div
              style={{
                padding: '16px',
                background: 'rgba(10, 14, 22, 0.9)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                color: '#e2e8f0',
                lineHeight: 1.65,
                maxHeight: '220px',
                overflowY: 'auto',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {snippet}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: 'var(--gradient-brand)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SourceModal;
