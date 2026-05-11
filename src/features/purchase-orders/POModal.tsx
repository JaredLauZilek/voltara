import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { SupplierPicker } from '@/features/suppliers';
import { ProductPicker, useProducts } from '@/features/products';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { PO_STATUSES, PO_CURRENCIES, calcPOTotal } from './types';
import type { PurchaseOrder, PurchaseOrderInsert, POCurrency } from './types';
import { POPrintModal } from './pdf/POPrintModal';

interface Props {
  po: PurchaseOrder | null;
  isSaving?: boolean;
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

export function POModal({ po, isSaving = false, onClose, onSave, onDelete }: Props) {
  const isNew = !po;
  const { data: products = [] } = useProducts();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [form, setForm] = useState<PurchaseOrderInsert>(
    po ?? {
      id: `PO-${String(Date.now()).slice(-4)}`,
      direction: 'outgoing',
      supplier_id: null,
      customer_id: null,
      line_items: [],
      discount: 0,
      notes: null,
      external_ref: null,
      status: 'Draft',
      currency: 'RM',
      created_date: todayISO(),
      delivery_date: null,
    }
  );

  const currency: POCurrency = (form.currency ?? 'RM') as POCurrency;

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
  const addCustomItem = () => {
    // Custom item: empty product_id, user fills in description as the label.
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { product_id: '', qty: 1, unit_price_snapshot: 0, description: '' }],
    }));
  };
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  const onProductChange = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateItem(i, { product_id: productId, unit_price_snapshot: p?.cost ?? 0 });
  };

  // Custom items count as valid as long as their description is non-empty.
  const allItemsValid = form.line_items.every((li) => li.product_id || (li.description?.trim().length ?? 0) > 0);
  const canSave = !!form.supplier_id && form.line_items.length > 0 && allItemsValid;

  return (
    <>
    <Modal title={isNew ? 'New Purchase Order' : po.id} onClose={onClose}>
      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Supplier</div>
        <SupplierPicker value={form.supplier_id} onChange={(id) => setForm((f) => ({ ...f, supplier_id: id }))} />
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
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as POCurrency }))}
            style={inputStyle}
          >
            {PO_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
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
      </div>

      <div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Line Items</label>
        </div>
        {form.line_items.map((item, i) => {
          const isCustom = !item.product_id;
          return (
          <div key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 8, alignItems: 'center' }}>
            {isCustom ? (
              <input
                value={item.description ?? ''}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                placeholder="Custom item (e.g. Shipping, Handling)…"
                style={{ ...inputStyle, padding: '9px 12px', fontSize: 13 }}
              />
            ) : (
              <ProductPicker value={item.product_id || null} onChange={(id) => onProductChange(i, id)} />
            )}
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
              {currency} {(item.qty * item.unit_price_snapshot).toLocaleString()}
            </div>
            <button
              onClick={() => removeItem(i)}
              style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: C.error }}
            >
              ×
            </button>
          </div>
          </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: form.line_items.length > 0 ? 4 : 0, marginBottom: 12 }}>
          <button
            onClick={addItem}
            style={{ fontSize: 12, fontWeight: 600, color: C.green, background: C.honeydew, border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Figtree' }}
          >
            + Add Item
          </button>
          <button
            onClick={addCustomItem}
            style={{ fontSize: 12, fontWeight: 600, color: C.slate, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Figtree' }}
          >
            + Add Custom
          </button>
        </div>
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
          <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
            {currency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
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

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button
                onClick={() => onDelete(po.id)}
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
              style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.errorBg}`, background: 'transparent', color: C.error, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Delete
            </button>
          )
        )}
        {!isNew && (
          <button
            onClick={() => setShowPrint(true)}
            style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.honeydew, color: C.green, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Print PDF
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
          disabled={!canSave || isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !canSave || isSaving ? C.slate : C.green,
            color: C.white,
            fontSize: 13,
            fontWeight: 700,
            cursor: !canSave ? 'not-allowed' : isSaving ? 'wait' : 'pointer',
          }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Create PO' : 'Save Changes'}
        </button>
      </div>
    </Modal>

    {showPrint && po && (
      <POPrintModal po={po} onClose={() => setShowPrint(false)} />
    )}
    </>
  );
}
