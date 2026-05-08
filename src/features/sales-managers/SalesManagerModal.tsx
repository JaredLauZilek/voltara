import { useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import type { SalesManager, SalesManagerInsert } from './types';

interface Props {
  manager: SalesManager | null;
  onClose: () => void;
  onSave: (row: SalesManagerInsert) => void;
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
  background: C.white,
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

const MAX_BYTES = 1_000_000;
const MAX_DIMENSION = 256;

function AvatarUploader({ value, name, onChange }: { value: string | null; name: string; onChange: (url: string | null) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const initials = name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) { setError('Image files only (PNG / JPG).'); return; }
    if (file.size > MAX_BYTES) { setError('Image must be under 1MB.'); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { setError('Could not process image.'); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setError('Could not load image.');
    img.src = URL.createObjectURL(file);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => fileInput.current?.click()}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: `2px dashed ${isDragging ? C.green : C.border}`,
          background: isDragging ? C.honeydew : (value ? 'transparent' : C.seasalt),
          cursor: 'pointer',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value ? (
          <img src={value} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 22, fontWeight: 700, color: C.green }}>{initials}</span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 4 }}>
          {value ? 'Click or drop to replace photo' : 'Click or drop to upload photo'}
        </div>
        <div style={{ fontSize: 11, color: C.slate }}>PNG or JPG · up to 1MB</div>
        {value && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); setError(null); }}
            style={{ marginTop: 4, border: 'none', background: 'transparent', color: '#C0321A', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree', padding: 0 }}
          >
            Remove photo
          </button>
        )}
        {error && <div style={{ marginTop: 4, fontSize: 11, color: '#C0321A', fontWeight: 600 }}>{error}</div>}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
}

export function SalesManagerModal({ manager, onClose, onSave, onDelete }: Props) {
  const isNew = !manager;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<SalesManagerInsert>(
    manager ?? {
      id: `SM-${String(Date.now()).slice(-5)}`,
      name: '',
      email: null,
      phone: null,
      target_revenue: 0,
      active: true,
      photo_data_url: null,
    }
  );

  return (
    <Modal
      title={isNew ? 'New Sales Manager' : form.name || 'Sales Manager'}
      subtitle={!isNew ? manager.id : undefined}
      onClose={onClose}
    >
      <AvatarUploader
        value={form.photo_data_url ?? null}
        name={form.name}
        onChange={(url) => setForm((f) => ({ ...f, photo_data_url: url }))}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Full Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={inputStyle}
            placeholder="e.g. Ahmad Faizal"
          />
        </div>

        <div>
          <label style={labelStyle}>Manager ID</label>
          <input
            value={form.id}
            onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
            style={inputStyle}
            disabled={!isNew}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setForm((f) => ({ ...f, active: val }))}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 10,
                  border: `2px solid ${form.active === val ? C.green : C.border}`,
                  background: form.active === val ? C.honeydew : C.white,
                  color: form.active === val ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {val ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
            style={inputStyle}
            placeholder="name@voltara.com.my"
          />
        </div>

        <div>
          <label style={labelStyle}>Phone</label>
          <input
            value={form.phone ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || null }))}
            style={inputStyle}
            placeholder="+60 1X-XXX XXXX"
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Monthly Revenue Target (RM)</label>
          <input
            type="number"
            min="0"
            value={form.target_revenue}
            onChange={(e) => setForm((f) => ({ ...f, target_revenue: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>
                This will unlink all associated quotes. Cannot be undone.
              </span>
              <button
                onClick={() => onDelete(manager.id)}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0321A', color: '#FFFFFF', fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
          )
        )}
        <button
          onClick={onClose}
          style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.name.trim()}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !form.name.trim() ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: !form.name.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {isNew ? 'Create Manager' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
