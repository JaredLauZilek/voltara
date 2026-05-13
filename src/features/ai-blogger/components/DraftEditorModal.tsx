import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import type { BlogDraft, BlogDraftUpdate, DraftStatus } from '../types';
import { DRAFT_STATUSES } from '../types';

interface Props {
  draft: BlogDraft;
  onClose: () => void;
  onSave: (patch: BlogDraftUpdate) => void;
  onDelete: () => void;
  isSaving: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};

export function DraftEditorModal({ draft, onClose, onSave, onDelete, isSaving }: Props) {
  const [form, setForm] = useState<BlogDraft>(draft);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Modal title={draft.title || 'Untitled draft'} subtitle={draft.id} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Slug</label>
          <input
            value={form.slug ?? ''}
            placeholder="auto from title if empty"
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value || null }))}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DraftStatus }))}
            style={inputStyle}
          >
            {DRAFT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Excerpt</label>
          <textarea
            value={form.excerpt ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value || null }))}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Body (Markdown)</label>
          <textarea
            value={form.body_md}
            onChange={(e) => setForm((f) => ({ ...f, body_md: e.target.value }))}
            rows={14}
            style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.55 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Target keywords (comma-separated)</label>
          <input
            value={form.target_keywords.join(', ')}
            onChange={(e) => setForm((f) => ({ ...f, target_keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Scheduled for</label>
          <input
            type="datetime-local"
            value={form.scheduled_at ? form.scheduled_at.slice(0, 16) : ''}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null }))}
            style={inputStyle}
          />
        </div>

        {form.failure_reason && (
          <div style={{ gridColumn: '1/-1', fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '8px 12px', background: '#FDEAEA', borderRadius: 8 }}>
            Last failure: {form.failure_reason}
          </div>
        )}

        {form.wix_post_url && (
          <div style={{ gridColumn: '1/-1', fontSize: 12, color: C.slate }}>
            Published at:{' '}
            <a href={form.wix_post_url} target="_blank" rel="noreferrer" style={{ color: C.green, fontWeight: 700 }}>
              {form.wix_post_url}
            </a>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>Permanent — cannot be undone.</span>
            <button
              onClick={onDelete}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0321A', color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Confirm Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A', fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({
            title: form.title,
            slug: form.slug,
            body_md: form.body_md,
            excerpt: form.excerpt,
            status: form.status,
            target_keywords: form.target_keywords,
            scheduled_at: form.scheduled_at,
          })}
          disabled={isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: isSaving ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: isSaving ? 'wait' : 'pointer',
          }}
        >
          {isSaving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
