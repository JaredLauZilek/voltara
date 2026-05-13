import { useState } from 'react';
import { C } from '@/shared/tokens';
import { useKeywords, useCreateKeyword, useDeleteKeyword } from '../hooks';

const INTENTS = ['informational', 'commercial', 'navigational', 'transactional'] as const;

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase',
  letterSpacing: '0.05em', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 13, outline: 'none',
};

export function KeywordsTab() {
  const { data: keywords = [] } = useKeywords();
  const createMut = useCreateKeyword();
  const deleteMut = useDeleteKeyword();

  const [draft, setDraft] = useState<{ keyword: string; intent: string; priority: number }>({
    keyword: '', intent: 'informational', priority: 0,
  });

  const addKeyword = () => {
    const k = draft.keyword.trim();
    if (!k) return;
    createMut.mutate(
      {
        id: `KW-${Date.now().toString(36).toUpperCase()}`,
        keyword: k,
        intent: draft.intent || null,
        priority: draft.priority,
      },
      { onSuccess: () => setDraft({ keyword: '', intent: 'informational', priority: 0 }) },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 10 }}>Add keyword</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Keyword</label>
            <input value={draft.keyword} onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Intent</label>
            <select value={draft.intent} onChange={(e) => setDraft((d) => ({ ...d, intent: e.target.value }))} style={inputStyle}>
              {INTENTS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <input type="number" value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: parseInt(e.target.value, 10) || 0 }))} style={inputStyle} />
          </div>
          <button
            onClick={addKeyword}
            disabled={!draft.keyword.trim() || createMut.isPending}
            style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: !draft.keyword.trim() ? C.slate : C.green,
              color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700,
              cursor: !draft.keyword.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Keyword', 'Intent', 'Priority', ''].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keywords.map((k) => (
              <tr key={k.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                <td style={{ padding: '13px 16px', fontWeight: 600 }}>{k.keyword}</td>
                <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>{k.intent ?? '—'}</td>
                <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{k.priority}</td>
                <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                  <button
                    onClick={() => deleteMut.mutate(k.id)}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A', fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keywords.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No keywords yet — these feed the agent's topic-selection prompt.
          </div>
        )}
      </div>
    </div>
  );
}
