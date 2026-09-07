import React from 'react';
import { Sparkles, FileSearch, Layers, MessageCircle, ShieldAlert } from 'lucide-react';

export function TestPlayground({ onSelectPrompt }) {
  const scenarios = [
    {
      id: 'fact',
      title: 'Fact Retrieval',
      desc: 'Retrieves PTO policy and cites Page 1',
      icon: <FileSearch size={16} color="#818cf8" />,
      prompt: 'How many days of paid time off (PTO) do full-time employees receive per year?',
      tag: 'Single Doc',
    },
    {
      id: 'synthesis',
      title: 'Cross-Doc Synthesis',
      desc: 'Synthesizes employee vs contractor policies',
      icon: <Layers size={16} color="#06b6d4" />,
      prompt: 'Compare paid time off and benefits for full-time employees versus contractors.',
      tag: 'Multi-Doc',
    },
    {
      id: 'followup',
      title: 'Pronoun Follow-up',
      desc: 'Tests multi-turn session state memory',
      icon: <MessageCircle size={16} color="#10b981" />,
      prompt: 'Can they roll over unused days into the next calendar year?',
      tag: 'Session State',
    },
    {
      id: 'hallucination',
      title: 'Anti-Hallucination',
      desc: 'Tests out-of-scope graceful fallback',
      icon: <ShieldAlert size={16} color="#f43f5e" />,
      prompt: 'What is the capital of France and what is the population of Paris?',
      tag: 'Graceful Fallback',
    },
  ];

  return (
    <div
      style={{
        margin: '16px 0',
        padding: '18px 20px',
        background: 'rgba(18, 24, 38, 0.6)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Sparkles size={16} color="var(--accent-primary)" />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Quick Test Scenarios (Evaluation Benchmark)
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
        }}
      >
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => onSelectPrompt(sc.prompt)}
            style={{
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {sc.icon}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>{sc.title}</span>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '4px',
                  color: 'var(--text-muted)',
                }}
              >
                {sc.tag}
              </span>
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {sc.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TestPlayground;
