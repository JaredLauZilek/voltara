import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { PLATFORMS, POST_TYPES, POST_STATUSES, PLATFORM_COLORS } from './types';
import type { Post, PostInsert } from './types';

interface Props {
  post: Post | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (row: PostInsert) => void;
  onDelete?: (id: string) => void;
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

export function PostModal({ post, defaultDate, onClose, onSave, onDelete }: Props) {
  const isNew = !post;
  const [form, setForm] = useState<PostInsert>(
    post ?? {
      id: `POST-${String(Date.now()).slice(-4)}`,
      platform: 'Instagram',
      title: '',
      caption: '',
      type: 'Product Highlight',
      status: 'Draft',
      scheduled_at: defaultDate ? `${defaultDate}T10:00:00+08:00` : new Date().toISOString(),
      media_url: null,
    }
  );

  return (
    <Modal title={isNew ? 'New Post' : form.title || 'Post'} onClose={onClose}>
      <div>
        <label style={labelStyle}>Platform</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATFORMS.map((p) => {
            const active = form.platform === p;
            return (
              <button
                key={p}
                onClick={() => setForm((f) => ({ ...f, platform: p }))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `2px solid ${active ? PLATFORM_COLORS[p] : C.border}`,
                  background: active ? `${PLATFORM_COLORS[p]}1A` : C.white,
                  color: active ? PLATFORM_COLORS[p] : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Title</label>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle}>
            {POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Post['status'] }))}
            style={inputStyle}
          >
            {POST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Scheduled at</label>
        <input
          type="datetime-local"
          value={form.scheduled_at.slice(0, 16)}
          onChange={(e) => setForm((f) => ({ ...f, scheduled_at: new Date(e.target.value).toISOString() }))}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Caption ({(form.caption ?? '').length} chars)</label>
        <textarea
          value={form.caption ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value || null }))}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!isNew && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.title}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !form.title ? C.slate : C.green,
            color: C.white,
            fontSize: 13,
            fontWeight: 700,
            cursor: !form.title ? 'not-allowed' : 'pointer',
          }}
        >
          {isNew ? 'Create Post' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
