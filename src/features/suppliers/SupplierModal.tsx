import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { SUPPLIER_STATUSES, SUPPLIER_CATEGORIES } from './types';
import type { Supplier, SupplierInsert } from './types';

interface Props {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (row: SupplierInsert) => void;
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

export function SupplierModal({ supplier, onClose, onSave, onDelete }: Props) {
  const isNew = !supplier;
  const [form, setForm] = useState<SupplierInsert>(
    supplier ?? {
      id: `SUP-${String(Date.now()).slice(-3)}`,
      name: '',
      category: 'Charger OEM',
      status: 'Prospect',
      contact: null,
      email: null,
      phone: null,
      address: null,
      payment_terms: null,
      lead_time_days: null,
      reg_number: null,
      rating: null,
      notes: null,
    }
  );

  return (
    <Modal title={isNew ? 'New Supplier' : form.name} subtitle={!isNew ? form.id : undefined} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Company Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
            {SUPPLIER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Supplier['status'] }))}
            style={inputStyle}
          >
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Contact Person</label>
          <input
            value={form.contact ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            value={form.email ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            value={form.phone ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Reg Number</label>
          <input
            value={form.reg_number ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, reg_number: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Address</label>
          <input
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Payment Terms</label>
          <input
            value={form.payment_terms ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value || null }))}
            placeholder="e.g. Net 30"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Lead Time (days)</label>
          <input
            type="number"
            value={form.lead_time_days ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, lead_time_days: e.target.value ? parseInt(e.target.value, 10) : null }))
            }
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Rating (0–5)</label>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={form.rating ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value ? parseFloat(e.target.value) : null }))}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!isNew && onDelete && (
          <button
            onClick={() => onDelete(supplier.id)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #FDEAEA',
              background: 'transparent',
              color: '#C0321A',
              fontFamily: 'Figtree',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.slate,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isNew ? 'Create' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
