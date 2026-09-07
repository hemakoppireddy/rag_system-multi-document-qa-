import React from 'react';
import { Layers, Database, Sparkles, Files, ShieldCheck } from 'lucide-react';

export function Header({ health, onToggleDocs, showDocs, docCount = 0 }) {
  const vectorCount = health?.stats?.indexedVectorsCount ?? 0;
  const provider = health?.provider || 'AI';
  const llmModel = health?.models?.llm || 'LLM';

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="brand-title">DocuSphere RAG</h1>
            <span className="brand-badge">Multi-Doc QA</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Vector Semantic Retrieval & Verified Citation System
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Stats Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '999px',
            fontSize: '0.8rem',
            color: '#c7d2fe',
          }}
        >
          <Database size={14} color="#818cf8" />
          <span>
            <strong style={{ color: '#ffffff' }}>{vectorCount}</strong> Chunks Indexed
          </span>
        </div>

        {/* AI Provider Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '999px',
            fontSize: '0.78rem',
            color: '#67e8f9',
          }}
        >
          <Sparkles size={13} />
          <span>{llmModel}</span>
        </div>

        {/* Document Library Button */}
        <button
          onClick={onToggleDocs}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 16px',
            background: showDocs ? 'var(--gradient-brand)' : 'var(--bg-card)',
            color: '#ffffff',
            border: '1px solid ' + (showDocs ? 'transparent' : 'var(--border-subtle)'),
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: showDocs ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <Files size={15} />
          <span>Knowledge Base ({docCount})</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
