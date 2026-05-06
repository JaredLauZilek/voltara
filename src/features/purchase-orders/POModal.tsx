import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { CustomerPicker } from '@/features/customers';
import { SupplierPicker } from '@/features/suppliers';
import { ProductPicker, useProducts } from '@/features/products';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { PO_STATUSES, calcPOTotal } from './types';
import type { PurchaseOrder, PurchaseOrderInsert } from './types';

interface Props {
  po: PurchaseOrder | null;
  onClose: () => void;
  onSave: (row: PurchaseOrderInsert) => void;
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

export function POModal({ po, onClose, onSave, onDelete }: Props) {
  const isNew = !po;
  const { data: products = [] } = useProducts();
  const [form, setForm] = useState<PurchaseOrderInsert>(
    po ?? {
      id: `PO-OUT-2026-${String(Date.now()).slice(-4)}`,
      direction: 'outgoing',
      supplier_id: null,
      customer_id: null,
      line_items: [],
      discount: 0,
      notes: null,
      external_ref: null,
      status: 'Draft',
      created_date: todayISO(),
      delivery_date: null,
    }
  );

  const total = calcPOTotal(form.line_items, form.discount);

  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)) }));
  const addItem = () => {
    const first = products[0];
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { product_id: first?.id ?? '', qty: 1, unit_price_snapshot: first?.cost ?? 0 }],
    }));
  };
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  const onProductChange = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    // For outgoing POs we buy at cost; incoming POs we sell at price.
    updateItem(i, {
      product_id: productId,
      unit_price_snapshot: form.direction === 'outgoing' ? p?.cost ?? 0 : p?.price ?? 0,
    });
  };

  const setDirection = (d: 'outgoing' | 'incoming') => {
    setForm((f) => ({
      ...f,
      direction: d,
      supplier_id: d === 'outgoing' ? f.supplier_id : null,
      customer_id: d === 'incoming' ? f.customer_id : null,
    }));
  };

  return (
    <Modal title={isNew ? 'New Purchase Order' : po.id} onClose={onClose}>
      <div>
        <label style={labelStyle}>Direction</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['outgoing', 'incoming'] as const).map((d) => {
            const label = d === 'outgoing' ? '↑ Outgoing (to supplier)' : '↓ Incoming (from customer)';
            return (
              <button
                key={d}
                onClick={() => setDirection(d)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `2px solid ${form.direction === d ? C.green : C.border}`,
                  background: form.direction === d ? C.honeydew : C.white,
                  color: form.direction === d ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {form.direction === 'outgoing' ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Supplier</div>
            <SupplierPicker value={form.supplier_id} onChange={(id) => setForm((f) => ({ ...f, supplier_id: id }))} />
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Customer</div>
            <CustomerPicker value={form.customer_id} onChange={(id) => setForm((f) => ({ ...f, customer_id: id }))} />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PurchaseOrder['status'] }))}
            style={inputStyle}
          >
            {PO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Created</label>
          <input
            type="date"
            value={form.created_date}
            onChange={(e) => setForm((f) => ({ ...f, created_date: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Delivery</label>
          <input
            type="date"
            value={form.delivery_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, delivery_date: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>External Ref</label>
        <input
          value={form.external_ref ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, external_ref: e.target.value || null }))}
          placeholder="Supplier/customer-side PO number"
          style={inputStyle}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={labelStyle}>Line Items</label>
          <button
            onClick={addItem}
            style={{ fontSize: 12, fontWeight: 600, color: C.green, background: C.honeydew, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'Figtree' }}
          >
            + Add Item
          </button>
        </div>
        {form.line_items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <ProductPicker value={item.product_id || null} onChange={(id) => onProductChange(i, id)} />
            <input
              type="number"
              min="1"
              value={item.qty}
              onChange={(e) => updateItem(i, { qty: parseInt(e.target.value, 10) || 1 })}
              style={{ ...inputStyle, padding: '7px 8px', fontSize: 12, textAlign: 'center' }}
            />
            <input
              type="number"
              value={item.unit_price_snapshot}
              onChange={(e) => updateItem(i, { unit_price_snapshot: parseFloat(e.target.value) || 0 })}
              style={{ ...inputStyle, padding: '7px 8px', fontSize: 12 }}
            />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
              RM {(item.qty * item.unit_price_snapshot).toLocaleString()}
            </div>
            <button
              onClick={() => removeItem(i)}
              style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: '#C0321A' }}
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.slate }}>Discount</span>
            <input
              type="number"
              min="0"
              max="100"
              value={form.discount}
              onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
              style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 12, outline: 'none', textAlign: 'center' }}
            />
            <span style={{ fontSize: 12, color: C.slate }}>%</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>RM {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!isNew && onDelete && (
          <button
            onClick={() => onDelete(po.id)}
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
          disabled={
            (form.direction === 'outgoing' && !form.supplier_id) ||
            (form.direction === 'incoming' && !form.customer_id) ||
            form.line_items.length === 0
          }
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background:
              (form.direction === 'outgoing' && !form.supplier_id) ||
              (form.direction === 'incoming' && !form.customer_id) ||
              form.line_items.length === 0
                ? C.slate
                : C.green,
            color: C.white,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isNew ? 'Create PO' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
