import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import type { BlogCompetitor, BlogKeyword } from '../types';

interface Props {
  keywords: BlogKeyword[];
  competitors: BlogCompetitor[];
  isGenerating: boolean;
  generateError: Error | null;
  onGenerate: (args: { topic?: string; keyword_ids?: string[]; competitor_ids?: string[] }) => void;
  onClose: () => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
};

export function GenerateDraftModal({ keywords, competitors, isGenerating, generateError, onGenerate, onClose }: Props) {
  const [topic, setTopic] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

  const toggle = (arr: string[], setArr: (a: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <Modal title="Generate a new draft" subtitle="Hand the agent a brief" onClose={onClose}>
      <div>
        <label style={labelStyle}>Topic / angle (optional)</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. EV charger installation cost in Klang Valley — buyer's guide for property managers"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
        <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>
          Leave blank and the agent picks an under-served topic from your competitor analysis.
        </div>
      </div>

      <div>
        <label style={labelStyle}>Target keywords</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, background: C.seasalt, borderRadius: 10, minHeight: 44 }}>
          {keywords.length === 0 && (
            <span style={{ fontSize: 12, color: C.slate, padding: '4px 6px' }}>
              No keywords yet — add some in the Keywords tab.
            </span>
          )}
          {keywords.map((k) => {
            const on = selectedKeywords.includes(k.id);
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => toggle(selectedKeywords, setSelectedKeywords, k.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: `1px solid ${on ? C.green : C.border}`,
                  background: on ? C.honeydew : C.white,
                  color: on ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {k.keyword}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Reference competitors</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, background: C.seasalt, borderRadius: 10, minHeight: 44 }}>
          {competitors.length === 0 && (
            <span style={{ fontSize: 12, color: C.slate, padding: '4px 6px' }}>
              No competitors yet — add some in the Competitors tab.
            </span>
          )}
          {competitors.map((c) => {
            const on = selectedCompetitors.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(selectedCompetitors, setSelectedCompetitors, c.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: `1px solid ${on ? C.green : C.border}`,
                  background: on ? C.honeydew : C.white,
                  color: on ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {generateError && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '10px 12px', background: '#FDEAEA', borderRadius: 8 }}>
          {generateError.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onGenerate({
            topic: topic.trim() || undefined,
            keyword_ids: selectedKeywords.length ? selectedKeywords : undefined,
            competitor_ids: selectedCompetitors.length ? selectedCompetitors : undefined,
          })}
          disabled={isGenerating}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: isGenerating ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: isGenerating ? 'wait' : 'pointer',
          }}
        >
          {isGenerating ? 'Drafting…' : 'Generate'}
        </button>
      </div>
    </Modal>
  );
}
