import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { CustomerPicker } from '@/features/customers';
import { ProductPicker, useProducts } from '@/features/products';
import { SalesManagerPicker } from '@/features/sales-managers';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { QUOTE_STATUSES, QUOTE_TYPES, calcQuoteTotal } from './types';
import type { Quote, QuoteInsert } from './types';

interface Props {
  quote: Quote | null;
  onClose: () => void;
  onSave: (row: QuoteInsert) => void;
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

export function QuoteModal({ quote, onClose, onSave, onDelete }: Props) {
  const isNew = !quote;
  const { data: products = [] } = useProducts();
  const [form, setForm] = useState<QuoteInsert>(
    quote ?? {
      id: `Q-2026-${String(Date.now()).slice(-3)}`,
      type: 'Quotation',
      customer_id: '',
      sales_manager_id: null,
      line_items: [],
      discount: 0,
      notes: null,
      status: 'Draft',
      valid_from: todayISO(),
      valid_to: todayISO(),
    }
  );

  const total = calcQuoteTotal(form.line_items, form.discount);

  const addItem = () => {
    const first = products[0];
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { product_id: first?.id ?? '', qty: 1, unit_price_snapshot: first?.price ?? 0 }],
    }));
  };
  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)) }));
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  const onProductChange = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateItem(i, {
      product_id: productId,
      unit_price_snapshot: p?.price ?? 0,
      description: p?.is_service ? (p.description ?? '') : undefined,
    });
  };

  return (
    <Modal title={isNew ? `New ${form.type}` : form.id} onClose={onClose}>
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {QUOTE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                border: `2px solid ${form.type === t ? C.green : C.border}`,
                background: form.type === t ? C.honeydew : C.white,
                color: form.type === t ? C.green : C.slate,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Quote['status'] }))}
          style={inputStyle}
        >
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Customer</div>
        <CustomerPicker value={form.customer_id || null} onChange={(id) => setForm((f) => ({ ...f, customer_id: id }))} />
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Sales Manager</div>
        <SalesManagerPicker
          value={form.sales_manager_id ?? null}
          onChange={(id) => setForm((f) => ({ ...f, sales_manager_id: id }))}
          placeholder="No sales manager assigned"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Valid From</label>
          <input
            type="date"
            value={form.valid_from}
            onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Valid Until</label>
          <input
            type="date"
            value={form.valid_to}
            onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={labelStyle}>Line Items</label>
          <button
            onClick={addItem}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: C.green,
              background: C.honeydew,
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'Figtree',
            }}
          >
            + Add Item
          </button>
        </div>
        {form.line_items.map((item, i) => {
          const itemProduct = products.find((x) => x.id === item.product_id);
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 8, alignItems: 'center' }}>
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
                  min="0"
                  value={item.unit_price_snapshot}
                  onChange={(e) => updateItem(i, { unit_price_snapshot: parseFloat(e.target.value) || 0 })}
                  style={{ ...inputStyle, padding: '7px 8px', fontSize: 12, textAlign: 'right' }}
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
              {itemProduct?.is_service && (
                <textarea
                  value={item.description ?? ''}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  rows={2}
                  placeholder="Service description (editable per quotation)…"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12, resize: 'vertical', lineHeight: 1.5, background: '#F9F9FF' }}
                />
              )}
            </div>
          );
        })}

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
        <label style={labelStyle}>Notes / Scope</label>
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
            onClick={() => onDelete(quote.id)}
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
          disabled={!form.customer_id || form.line_items.length === 0}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !form.customer_id || form.line_items.length === 0 ? C.slate : C.green,
            color: C.white,
            fontSize: 13,
            fontWeight: 700,
            cursor: !form.customer_id || form.line_items.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isNew ? `Create ${form.type}` : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
