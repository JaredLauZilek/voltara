import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { CustomerPicker } from '@/features/customers';
import { ProductPicker, useProducts } from '@/features/products';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { INVOICE_STATUSES } from './types';
import type { Invoice, InvoiceInsert } from './types';
import { calcInvoiceTotals } from './totals';
import { renderInvoicePDF, downloadBlob } from './pdf';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (row: InvoiceInsert) => void;
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

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Draft:     { bg: '#F3F3F3', color: '#767B77' },
  Sent:      { bg: '#E3F0FF', color: '#1A62C0' },
  Paid:      { bg: '#E4F3E3', color: '#1B512D' },
  Overdue:   { bg: '#FDEAEA', color: '#C0321A' },
  Cancelled: { bg: '#FFF0E0', color: '#B45309' },
};

export function InvoiceModal({ invoice, onClose, onSave, onDelete }: Props) {
  const isNew = !invoice;
  const { data: products = [] } = useProducts();

  const [form, setForm] = useState<InvoiceInsert>(
    invoice ?? {
      id: `INV-2026-${String(Date.now()).slice(-4)}`,
      customer_id: '',
      line_items: [],
      discount: 0,
      tax: 8,
      notes: null,
      status: 'Draft',
      issue_date: todayISO(),
      due_date: todayISO(),
    }
  );

  const totals = calcInvoiceTotals(form.line_items, form.discount, form.tax);

  const addItem = () => {
    const first = products[0];
    setForm((f) => ({
      ...f,
      line_items: [...f.line_items, { product_id: first?.id ?? '', qty: 1, unit_price_snapshot: first?.price ?? 0 }],
    }));
  };
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)) }));

  const onProductChange = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateItem(i, { product_id: productId, unit_price_snapshot: p?.price ?? 0 });
  };

  const handlePrint = async () => {
    const blob = await renderInvoicePDF(form as Invoice);
    downloadBlob(blob, `${form.id}.${blob.type === 'application/pdf' ? 'pdf' : 'txt'}`);
  };

  return (
    <Modal
      title={isNew ? 'New Invoice' : form.id}
      subtitle={!isNew ? `Issued ${form.issue_date} · Due ${form.due_date}` : undefined}
      onClose={onClose}
    >
      <div>
        <label style={labelStyle}>Status</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {INVOICE_STATUSES.map((s) => {
            const sc = STATUS_PILL[s];
            const active = form.status === s;
            return (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `2px solid ${active ? sc.color : C.border}`,
                  background: active ? sc.bg : C.white,
                  color: active ? sc.color : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Bill To</div>
        <CustomerPicker value={form.customer_id || null} onChange={(id) => setForm((f) => ({ ...f, customer_id: id }))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Issue Date</label>
          <input
            type="date"
            value={form.issue_date}
            onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 8, marginBottom: 6 }}>
          {['Product', 'Qty', 'Unit Price', 'Subtotal', ''].map((h, i) => (
            <div
              key={i}
              style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {h}
            </div>
          ))}
        </div>
        {form.line_items.map((item, i) => {
          const lineTotal = item.unit_price_snapshot * item.qty;
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px 90px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <ProductPicker value={item.product_id || null} onChange={(id) => onProductChange(i, id)} />
              <input
                type="number"
                min="1"
                value={item.qty}
                onChange={(e) => updateItem(i, { qty: parseInt(e.target.value, 10) || 1 })}
                style={{ ...inputStyle, padding: '7px 8px', fontSize: 12, textAlign: 'center' }}
              />
              <div style={{ fontSize: 12, color: C.slate }}>RM {item.unit_price_snapshot.toLocaleString()}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>RM {lineTotal.toLocaleString()}</div>
              <button
                onClick={() => removeItem(i)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#C0321A',
                  fontSize: 14,
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        {form.line_items.length === 0 && (
          <div style={{ padding: '12px', textAlign: 'center', color: C.slate, fontSize: 12 }}>
            No line items. Click <strong>+ Add Item</strong>.
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.divider}`, marginTop: 8, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Row label="Subtotal" value={`RM ${totals.subtotal.toLocaleString()}`} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.slate }}>Discount</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="0"
                max="100"
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                style={{ width: 50, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 12, outline: 'none', textAlign: 'center' }}
              />
              <span style={{ fontSize: 12, color: C.slate }}>%</span>
              <span style={{ fontSize: 12, color: '#C0321A' }}>− RM {totals.discountAmt.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.slate }}>Tax (SST)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                min="0"
                max="100"
                value={form.tax}
                onChange={(e) => setForm((f) => ({ ...f, tax: parseFloat(e.target.value) || 0 }))}
                style={{ width: 50, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 12, outline: 'none', textAlign: 'center' }}
              />
              <span style={{ fontSize: 12, color: C.slate }}>%</span>
              <span style={{ fontSize: 12, color: C.slate }}>+ RM {totals.taxAmt.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.divider}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
              RM {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={2}
          placeholder="Payment instructions, remarks…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!isNew && onDelete && (
          <button
            onClick={() => onDelete(invoice.id)}
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
          onClick={handlePrint}
          style={{
            padding: '10px 16px',
            borderRadius: 10,
            border: `1px solid ${C.green}`,
            background: 'transparent',
            color: C.green,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: isNew ? 'auto' : 0,
          }}
        >
          Print PDF
        </button>
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
          }}
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
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: !form.customer_id || form.line_items.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {isNew ? 'Create Invoice' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, color: C.slate }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
