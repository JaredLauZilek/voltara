import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { SUPPLIER_STATUSES } from './types';
import type { Supplier, SupplierInsert, SupplierKind } from './types';
import { SupplierCategoryPicker } from './SupplierCategoryPicker';

interface Props {
  supplier: Supplier | null;
  defaultKind?: SupplierKind;
  isSaving?: boolean;
  saveError?: Error | null;
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

export function SupplierModal({ supplier, defaultKind, isSaving = false, saveError, onClose, onSave, onDelete }: Props) {
  const isNew = !supplier;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<SupplierInsert>(
    supplier ?? {
      id: `SUP-${String(Date.now()).slice(-3)}`,
      name: '',
      category: 'Charger OEM',
      kind: defaultKind ?? 'Supplier',
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

  const titleKind: SupplierKind = supplier?.kind ?? defaultKind ?? 'Supplier';

  return (
    <Modal title={isNew ? `New ${titleKind}` : form.name} subtitle={!isNew ? form.id : undefined} onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Company Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <SupplierCategoryPicker
            kind={titleKind}
            value={form.category}
            onChange={(name) => setForm((f) => ({ ...f, category: name }))}
          />
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
          <textarea
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
            rows={3}
            placeholder="Multi-line address — newlines are preserved on printed POs."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
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

      {saveError && (
        <div style={{ fontSize: 12, color: C.error, fontWeight: 600, padding: '8px 12px', background: C.errorBg, borderRadius: 8 }}>
          {saveError.message || 'Save failed.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button
                onClick={() => onDelete(supplier.id)}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: C.error, color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
              style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.errorBg}`, background: 'transparent', color: C.error, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Delete
            </button>
          )
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
          {isSaving ? 'Saving…' : isNew ? 'Create' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
