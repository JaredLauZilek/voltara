import { useState } from 'react';
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
    }
  );

  return (
    <Modal
      title={isNew ? 'New Sales Manager' : form.name || 'Sales Manager'}
      subtitle={!isNew ? manager.id : undefined}
      onClose={onClose}
    >
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
