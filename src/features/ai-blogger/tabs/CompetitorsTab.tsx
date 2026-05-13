import { useState } from 'react';
import { C } from '@/shared/tokens';
import { useCompetitors, useCreateCompetitor, useUpdateCompetitor, useDeleteCompetitor } from '../hooks';
import type { BlogCompetitor } from '../types';

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase',
  letterSpacing: '0.05em', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 13, outline: 'none',
};

export function CompetitorsTab() {
  const { data: competitors = [] } = useCompetitors();
  const createMut = useCreateCompetitor();
  const updateMut = useUpdateCompetitor();
  const deleteMut = useDeleteCompetitor();

  const [draft, setDraft] = useState({ name: '', website: '', notes: '' });

  const addCompetitor = () => {
    if (!draft.name.trim()) return;
    createMut.mutate(
      {
        id: `COMP-${Date.now().toString(36).toUpperCase()}`,
        name: draft.name.trim(),
        website: draft.website.trim() || null,
        notes: draft.notes.trim() || null,
      },
      { onSuccess: () => setDraft({ name: '', website: '', notes: '' }) },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 10 }}>Add competitor</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Brand name</label>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Website</label>
            <input value={draft.website} placeholder="https://…" onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input value={draft.notes} placeholder="Why we track them" onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} style={inputStyle} />
          </div>
          <button
            onClick={addCompetitor}
            disabled={!draft.name.trim() || createMut.isPending}
            style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: !draft.name.trim() ? C.slate : C.green,
              color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700,
              cursor: !draft.name.trim() ? 'not-allowed' : 'pointer',
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
              {['Name', 'Website', 'Notes', ''].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.map((c) => (
              <Row key={c.id} c={c} onSave={(patch) => updateMut.mutate({ id: c.id, patch })} onDelete={() => deleteMut.mutate(c.id)} />
            ))}
          </tbody>
        </table>
        {competitors.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No competitors tracked yet.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ c, onSave, onDelete }: { c: BlogCompetitor; onSave: (patch: Partial<BlogCompetitor>) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: c.name, website: c.website ?? '', notes: c.notes ?? '' });

  if (!editing) {
    return (
      <tr style={{ borderBottom: `1px solid ${C.divider}` }}>
        <td style={{ padding: '13px 16px', fontWeight: 600 }}>{c.name}</td>
        <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>
          {c.website ? (
            <a href={c.website} target="_blank" rel="noreferrer" style={{ color: C.green, textDecoration: 'none' }}>{c.website}</a>
          ) : '—'}
        </td>
        <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>{c.notes ?? '—'}</td>
        <td style={{ padding: '13px 16px' }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditing(true)} style={btn('outline')}>Edit</button>
            <button onClick={onDelete} style={btn('danger')}>Delete</button>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr style={{ borderBottom: `1px solid ${C.divider}`, background: C.seasalt }}>
      <td style={{ padding: '10px 16px' }}>
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }} />
      </td>
      <td style={{ padding: '10px 16px' }}>
        <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }} />
      </td>
      <td style={{ padding: '10px 16px' }}>
        <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, padding: '6px 8px' }} />
      </td>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            onClick={() => { onSave({ name: form.name, website: form.website || null, notes: form.notes || null }); setEditing(false); }}
            style={btn('primary')}
          >
            Save
          </button>
          <button onClick={() => setEditing(false)} style={btn('outline')}>Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function btn(variant: 'primary' | 'outline' | 'danger'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '5px 10px', borderRadius: 8, fontFamily: 'Figtree',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
  };
  if (variant === 'primary')
    return { ...base, border: 'none', background: C.green, color: C.white };
  if (variant === 'danger')
    return { ...base, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A' };
  return { ...base, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate };
}
