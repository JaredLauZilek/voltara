import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { SupplierPicker } from '@/features/suppliers';
import { PRODUCT_CATEGORIES, margin } from './types';
import type { Product, ProductInsert } from './types';

interface Props {
  product: Product | null;
  isService?: boolean;
  onClose: () => void;
  onSave: (row: ProductInsert) => void;
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

export function ProductModal({ product, isService: isServiceProp, onClose, onSave, onDelete }: Props) {
  const isNew = !product;
  const isService = product?.is_service ?? isServiceProp ?? false;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<ProductInsert>(
    product ?? {
      id: isService ? `SVC-${String(Date.now()).slice(-5)}` : `SKU-${String(Date.now()).slice(-5)}`,
      name: '',
      category: isService ? 'Service' : 'Charger Units',
      is_service: isService,
      cost: 0,
      price: 0,
      qty: isService ? null : 0,
      reorder_level: 0,
      supplier_id: null,
      location: null,
      description: null,
    }
  );

  const m = margin(form as Product);

  const modalTitle = isNew
    ? (isService ? 'New Service' : 'New Product')
    : form.name;

  return (
    <Modal title={modalTitle} subtitle={!isNew ? form.id : undefined} onClose={onClose}>
      {isService && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E3F0FF', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#1A62C0' }}>
          ◆ Service — always available, no stock tracking
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder={isService ? 'e.g. Annual Maintenance Service' : ''} />
        </div>
        <div>
          <label style={labelStyle}>{isService ? 'Service ID' : 'SKU'}</label>
          <input value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} style={inputStyle} disabled={!isNew} />
        </div>

        {!isService && (
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Cost (RM)</label>
          <input
            type="number"
            value={form.cost}
            onChange={(e) => setForm((f) => ({ ...f, cost: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Default Price (RM)</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ background: C.honeydew, borderRadius: 10, padding: '8px 14px', fontSize: 12, color: C.green, fontWeight: 600 }}>
            Margin: <strong>{m.toFixed(1)}%</strong>
          </div>
        </div>

        {!isService && (
          <>
            <div>
              <label style={labelStyle}>On-hand qty</label>
              <input
                type="number"
                value={form.qty ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, qty: parseInt(e.target.value, 10) || 0 }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Reorder level</label>
              <input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm((f) => ({ ...f, reorder_level: parseInt(e.target.value, 10) || 0 }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Supplier</label>
              <SupplierPicker value={form.supplier_id} onChange={(id) => setForm((f) => ({ ...f, supplier_id: id }))} />
            </div>
            <div>
              <label style={labelStyle}>Storage location</label>
              <input
                value={form.location ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value || null }))}
                style={inputStyle}
              />
            </div>
          </>
        )}

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Default Description</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
            rows={isService ? 4 : 2}
            placeholder={isService ? 'Describe what this service includes — shown on quotes and invoices, editable per quotation…' : 'Optional product description…'}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>
                This is permanent and cannot be undone.
              </span>
              <button
                onClick={() => onDelete(product.id)}
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
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          {isNew ? (isService ? 'Create Service' : 'Create Product') : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
