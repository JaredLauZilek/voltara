import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { CustomerPicker, useCustomers } from '@/features/customers';
import { ProductPicker, useProducts } from '@/features/products';
import { SalesManagerPicker } from '@/features/sales-managers';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { QUOTE_STATUSES, QUOTE_TYPES, calcQuoteTotal } from './types';
import type { Quote, QuoteInsert } from './types';
import { AttachmentsField } from '@/shared/components/AttachmentsField';
import { QuotePrintModal } from './pdf/QuotePrintModal';

interface Props {
  quote: Quote | null;
  onClose: () => void;
  onSave: (row: QuoteInsert) => void;
  isSaving?: boolean;
  onDelete?: (
    id: string,
    poAttachments: Quote['customer_po_attachments'],
    proposalAttachments: Quote['proposal_attachments'],
  ) => void;
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

// Quotations expire in 30 days; proposals run a 6-month validity window.
function defaultValidTo(type: Quote['type']): string {
  const d = new Date();
  if (type === 'Proposal') d.setMonth(d.getMonth() + 6);
  else d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

export function QuoteModal({ quote, onClose, onSave, isSaving = false, onDelete }: Props) {
  const isNew = !quote;
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const [showPrint, setShowPrint] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<QuoteInsert>(() => {
    if (quote) return quote;
    return {
      id: `Q-2026-${String(Date.now()).slice(-3)}`,
      type: 'Quotation',
      customer_id: '',
      sales_manager_id: null,
      line_items: [],
      discount: 0,
      notes: null,
      status: 'Draft',
      valid_from: todayISO(),
      valid_to: defaultValidTo('Quotation'),
      last_followup_date: todayISO(),
      customer_po_attachments: [],
      proposal_attachments: [],
    };
  });

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
      // Snapshot the master description so the user can edit it per-quote.
      description: p?.description ?? '',
    });
  };

  return (
    <>
    <Modal title={isNew ? `New ${form.type}` : form.id} onClose={onClose}>
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {QUOTE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() =>
                setForm((f) => {
                  // Proposals are non-residential only — clear an incompatible
                  // customer when switching type so the form can't be saved with a stale residential.
                  const current = customers.find((c) => c.id === f.customer_id);
                  const clearCustomer = t === 'Proposal' && current?.type === 'Residential';
                  return {
                    ...f,
                    type: t,
                    customer_id: clearCustomer ? '' : f.customer_id,
                    // Reset validity window to the new type's default; users can still tweak it.
                    valid_to: isNew ? defaultValidTo(t) : f.valid_to,
                  };
                })
              }
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
        <CustomerPicker
          value={form.customer_id || null}
          onChange={(id) => setForm((f) => ({ ...f, customer_id: id }))}
          filter={form.type === 'Proposal' ? (c) => c.type !== 'Residential' : undefined}
        />
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Sales Manager</div>
        <SalesManagerPicker
          value={form.sales_manager_id ?? null}
          onChange={(id) => setForm((f) => ({ ...f, sales_manager_id: id }))}
          placeholder="No sales manager assigned"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
        <div>
          <label style={labelStyle}>Last Follow-up</label>
          <input
            type="date"
            value={form.last_followup_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, last_followup_date: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={{ ...labelStyle, marginBottom: 10 }}>Line Items</label>
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
              {item.product_id && (
                <textarea
                  value={item.description ?? itemProduct?.description ?? ''}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  rows={2}
                  placeholder="Description (editable per quotation)…"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12, resize: 'vertical', lineHeight: 1.5, background: '#F9F9FF' }}
                />
              )}
            </div>
          );
        })}

        <button
          onClick={addItem}
          style={{
            marginTop: form.line_items.length > 0 ? 4 : 0,
            fontSize: 12,
            fontWeight: 600,
            color: C.green,
            background: C.honeydew,
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            cursor: 'pointer',
            fontFamily: 'Figtree',
            alignSelf: 'flex-start',
          }}
        >
          + Add Item
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 12, borderTop: `1px solid ${C.divider}` }}>
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

      {form.type === 'Proposal' && (
        <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Proposal Document</div>
          <div style={{ fontSize: 12, color: C.slate }}>
            Attach the proposal PDF for this customer.
          </div>
          <AttachmentsField
            value={form.proposal_attachments ?? []}
            onChange={(next) => setForm((f) => ({ ...f, proposal_attachments: next }))}
            storagePath={`quotes/${form.id}/proposal`}
            label="proposal document"
          />
        </div>
      )}

      <div>
        <label style={labelStyle}>Notes / Scope</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Remarks <span style={{ color: C.slate, fontWeight: 600 }}>(not printed)</span>
        </label>
        <textarea
          value={form.remarks ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value || null }))}
          rows={2}
          placeholder="Internal notes — never appear on the printed PDF."
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, background: '#FFFBEA', borderColor: '#F5E6A8' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button
                onClick={() => onDelete(quote.id, quote.customer_po_attachments ?? [], quote.proposal_attachments ?? [])}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0321A', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
          disabled={!form.customer_id || form.line_items.length === 0 || isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !form.customer_id || form.line_items.length === 0 ? C.slate : C.green,
            color: C.white,
            fontSize: 13,
            fontWeight: 700,
            cursor: !form.customer_id || form.line_items.length === 0 || isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving…' : isNew ? `Create ${form.type}` : 'Save Changes'}
        </button>
      </div>
    </Modal>

    {showPrint && quote && (
      <QuotePrintModal quote={quote} onClose={() => setShowPrint(false)} />
    )}
  </>
  );
}
