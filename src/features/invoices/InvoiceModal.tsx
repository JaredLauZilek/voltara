import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { CustomerPicker, useCustomers } from '@/features/customers';
import { ProductPicker, useProducts } from '@/features/products';
import { useQuotes } from '@/features/sales';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { INVOICE_STATUSES } from './types';
import type { Invoice, InvoiceInsert } from './types';
import { calcInvoiceTotals } from './totals';
import { InvoicePrintModal } from './pdf/InvoicePrintModal';
import { PaymentsSection } from './payments/PaymentsSection';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (row: InvoiceInsert) => void;
  isSaving?: boolean;
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
  Draft:            { bg: '#F3F3F3', color: '#767B77' },
  Sent:             { bg: '#E3F0FF', color: '#1A62C0' },
  'Partially Paid': { bg: '#FFF8E1', color: '#B07D00' },
  Paid:             { bg: '#E4F3E3', color: '#1B512D' },
  Overdue:          { bg: '#FDEAEA', color: '#C0321A' },
  Cancelled:        { bg: '#FFF0E0', color: '#B45309' },
};

export function InvoiceModal({ invoice, onClose, onSave, isSaving = false, onDelete }: Props) {
  const isNew = !invoice;
  const { data: products = [] } = useProducts();
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  // Tax is opt-in. For existing invoices, derive from the saved value.
  const [taxEnabled, setTaxEnabled] = useState(() => (invoice?.tax ?? 0) > 0);

  const [form, setForm] = useState<InvoiceInsert>(
    invoice ?? {
      id: `INV-2026-${String(Date.now()).slice(-4)}`,
      customer_id: '',
      quote_id: null,
      line_items: [],
      discount: 0,
      discount_mode: 'percent',
      tax: 0,
      notes: null,
      status: 'Draft',
      issue_date: todayISO(),
      due_date: todayISO(),
      deposit_percent: null,
    }
  );

  // Only Case Won quotes are eligible to be invoiced — billing only happens
  // once a quote is accepted by the customer.
  const eligibleQuotes = useMemo(
    () => quotes.filter((q) => q.status === 'Case Won'),
    [quotes]
  );

  const linkedQuote = quotes.find((q) => q.id === form.quote_id) ?? null;

  const handleQuoteChange = (quoteId: string | null) => {
    if (!quoteId) {
      setForm((f) => ({ ...f, quote_id: null }));
      return;
    }
    const q = quotes.find((qq) => qq.id === quoteId);
    if (!q) return;
    setForm((f) => ({
      ...f,
      quote_id: q.id,
      // Auto-populate from the quote — user can still adjust before saving
      customer_id: q.customer_id,
      line_items: q.line_items,
      discount: q.discount ?? 0,
      // Carry the quote's notes through to the invoice as a starting point
      notes: q.notes ?? f.notes,
    }));
  };

  const totals = calcInvoiceTotals(form.line_items, form.discount, form.tax, form.discount_mode ?? 'percent');

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
    updateItem(i, {
      product_id: productId,
      unit_price_snapshot: p?.price ?? 0,
      // Snapshot the product's current description so the user can edit it
      // per-invoice. Lines pre-filled from a quote keep the quote's text.
      description: p?.description ?? '',
    });
  };

  return (
    <>
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

      <div>
        <label style={labelStyle}>Linked Quotation / Proposal</label>
        <SearchableSelect
          options={eligibleQuotes.map((q) => {
            const c = customers.find((x) => x.id === q.customer_id);
            return {
              value: q.id,
              label: `${q.id} · ${q.type}`,
              meta: `${c?.name ?? q.customer_id} · ${q.status}`,
            };
          })}
          value={form.quote_id ?? null}
          onChange={(id) => handleQuoteChange(id)}
          placeholder="— Select a quote / proposal —"
          nullable
          nullLabel="— Select a quote / proposal —"
          disabled={!isNew}
        />
        {isNew && !form.quote_id && (
          <div style={{ fontSize: 11, color: '#C0321A', marginTop: 6, fontWeight: 600 }}>
            An invoice must be tied to a quotation or proposal.
          </div>
        )}
        {!isNew && !form.quote_id && (
          <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>
            Legacy invoice — not linked to a quotation.
          </div>
        )}
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Bill To</div>
        <CustomerPicker value={form.customer_id || null} onChange={(id) => setForm((f) => ({ ...f, customer_id: id }))} />
        {linkedQuote && (
          <div style={{ fontSize: 11, color: C.slate, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>
              Pre-filled from {linkedQuote.id}{linkedQuote.discount > 0 ? ` (discount ${linkedQuote.discount}%)` : ''}.
              You can still adjust customer, line items, or discount below.
            </span>
            {!isNew && (linkedQuote.discount !== form.discount || linkedQuote.line_items.length !== form.line_items.length) && (
              <button
                onClick={() => handleQuoteChange(linkedQuote.id)}
                style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, fontFamily: 'Figtree', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                Re-sync from quote
              </button>
            )}
          </div>
        )}
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
            style={{
              ...inputStyle,
              borderColor: form.due_date && form.due_date < form.issue_date ? C.error : C.border,
            }}
          />
          {form.due_date && form.due_date < form.issue_date && (
            <div style={{ fontSize: 11, color: C.error, marginTop: 4, fontWeight: 600 }}>
              Due date can't be before the issue date.
            </div>
          )}
        </div>
      </div>

      <div>
        <label style={{ ...labelStyle, marginBottom: 10 }}>Line Items</label>
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
                  step="0.01"
                  value={item.unit_price_snapshot}
                  onChange={(e) =>
                    updateItem(i, { unit_price_snapshot: parseFloat(e.target.value) || 0 })
                  }
                  style={{ ...inputStyle, padding: '7px 8px', fontSize: 12, textAlign: 'right' }}
                />
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>RM {lineTotal.toLocaleString()}</div>
                <button
                  onClick={() => removeItem(i)}
                  style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: '#C0321A', fontSize: 14 }}
                >
                  ×
                </button>
              </div>
              {item.product_id && (
                <textarea
                  value={item.description ?? itemProduct?.description ?? ''}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                  rows={2}
                  placeholder="Description (editable per invoice)…"
                  style={{ ...inputStyle, marginTop: 6, fontSize: 12, resize: 'vertical', lineHeight: 1.5, background: '#F9F9FF' }}
                />
              )}
            </div>
          );
        })}
        {form.line_items.length === 0 && (
          <div style={{ padding: '12px', textAlign: 'center', color: C.slate, fontSize: 12 }}>
            No line items. Click <strong>+ Add Item</strong> below.
          </div>
        )}

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

        {/* Stock adjustment preview — shows the delta the DB trigger
            (fn_invoice_inventory_diff) will apply on Save. Baseline depends
            on whether this is a new invoice (compare against the linked
            quote, which Case Won already deducted) or an edit (compare
            against the last-saved invoice). After save the prop refreshes,
            form === baseline, and the panel disappears until the next edit. */}
        {(() => {
          const baseline = isNew
            ? (linkedQuote?.line_items ?? [])
            : (invoice?.line_items ?? []);
          if (baseline.length === 0 && form.line_items.length === 0) return null;

          const baselineQtyById = new Map<string, number>();
          for (const li of baseline) {
            if (!li.product_id) continue;
            baselineQtyById.set(li.product_id, (baselineQtyById.get(li.product_id) ?? 0) + li.qty);
          }
          const currentQtyById = new Map<string, number>();
          for (const li of form.line_items) {
            if (!li.product_id) continue;
            currentQtyById.set(li.product_id, (currentQtyById.get(li.product_id) ?? 0) + li.qty);
          }
          const allIds = new Set([...baselineQtyById.keys(), ...currentQtyById.keys()]);
          const diffs: Array<{
            productId: string;
            name: string;
            baselineQty: number;
            currentQty: number;
            delta: number;
          }> = [];
          for (const id of allIds) {
            const product = products.find((p) => p.id === id);
            if (product?.is_service) continue;
            const b = baselineQtyById.get(id) ?? 0;
            const c = currentQtyById.get(id) ?? 0;
            const delta = c - b;
            if (delta !== 0) {
              diffs.push({ productId: id, name: product?.name ?? id, baselineQty: b, currentQty: c, delta });
            }
          }
          if (diffs.length === 0) return null;

          const baselineLabel = isNew ? 'Quote Qty' : 'Saved Qty';
          const currentLabel = isNew ? 'Invoice Qty' : 'New Qty';
          const headerLabel = isNew
            ? `Stock adjustment on save (vs ${linkedQuote?.id ?? 'quote'})`
            : 'Stock adjustment on save (vs last save)';

          return (
            <div style={{ marginTop: 14, background: '#FFF8E1', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#B07D00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {headerLabel}
              </div>
              <div style={{ fontSize: 11, color: C.slate, lineHeight: 1.45 }}>
                Saving will apply the deltas below to <strong>products.qty</strong>. Positive Δ deducts
                more from stock; negative Δ restores. Services are skipped.
              </div>
              <div style={{ background: C.white, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.seasalt }}>
                      {['Product', 'SKU', baselineLabel, currentLabel, 'Δ'].map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d) => {
                      const positive = d.delta > 0;
                      const tone = positive ? '#C0321A' : C.green;
                      return (
                        <tr key={d.productId} style={{ borderBottom: `1px solid ${C.divider}` }}>
                          <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1a1a1a' }}>{d.name}</td>
                          <td style={{ padding: '9px 12px', color: C.slate, fontSize: 12 }}>{d.productId}</td>
                          <td style={{ padding: '9px 12px', color: C.slate }}>{d.baselineQty}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1a1a1a' }}>{d.currentQty}</td>
                          <td style={{ padding: '9px 12px', fontWeight: 700, color: tone }}>
                            {positive ? '+' : ''}{d.delta}
                            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: C.slate }}>
                              ({positive ? 'will deduct' : 'will restore'})
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        <div style={{ borderTop: `1px solid ${C.divider}`, marginTop: 12, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Row label="Subtotal" value={`RM ${totals.subtotal.toLocaleString()}`} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.slate }}>Discount</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'inline-flex', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
                {(['percent', 'amount'] as const).map((mode) => {
                  const active = (form.discount_mode ?? 'percent') === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, discount_mode: mode, discount: 0 }))}
                      style={{
                        padding: '3px 8px',
                        border: 'none',
                        background: active ? C.green : C.white,
                        color: active ? C.white : C.slate,
                        fontFamily: 'Figtree',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {mode === 'percent' ? '%' : 'RM'}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min="0"
                max={form.discount_mode === 'amount' ? undefined : 100}
                step={form.discount_mode === 'amount' ? '0.01' : '1'}
                value={form.discount}
                onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                style={{ width: form.discount_mode === 'amount' ? 80 : 50, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 12, outline: 'none', textAlign: 'center' }}
              />
              <span style={{ fontSize: 12, color: '#C0321A' }}>− RM {totals.discountAmt.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => {
                const next = !taxEnabled;
                setTaxEnabled(next);
                setForm((f) => ({ ...f, tax: next ? (f.tax > 0 ? f.tax : 8) : 0 }));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                borderRadius: 8,
                border: `1px solid ${taxEnabled ? C.green : C.border}`,
                background: taxEnabled ? C.honeydew : 'transparent',
                color: taxEnabled ? C.green : C.slate,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                border: `2px solid ${taxEnabled ? C.green : C.slate}`,
                background: taxEnabled ? C.green : 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.white,
                fontSize: 10,
                fontWeight: 800,
              }}>{taxEnabled ? '✓' : ''}</span>
              Tax (SST)
            </button>
            {taxEnabled && (
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
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${C.divider}` }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
              RM {totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {!isNew && invoice && (
        <PaymentsSection
          invoice={invoice}
          depositPercent={form.deposit_percent ?? null}
          onDepositPercentChange={(v) => setForm((f) => ({ ...f, deposit_percent: v }))}
        />
      )}

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

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button
                onClick={() => onDelete(invoice.id)}
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
        {(() => {
          const dueBeforeIssue = !!form.issue_date && !!form.due_date && form.due_date < form.issue_date;
          const invalid =
            !form.customer_id ||
            form.line_items.length === 0 ||
            (isNew && !form.quote_id) ||
            dueBeforeIssue;
          const blocked = invalid || isSaving;
          return (
            <button
              onClick={() => onSave(form)}
              disabled={blocked}
              style={{
                padding: '10px 24px',
                borderRadius: 10,
                border: 'none',
                background: invalid ? C.slate : C.green,
                color: C.white,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 700,
                cursor: blocked ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? 'Saving…' : isNew ? 'Create Invoice' : 'Save Changes'}
            </button>
          );
        })()}
      </div>
    </Modal>

    {showPrint && invoice && (
      <InvoicePrintModal invoice={invoice} onClose={() => setShowPrint(false)} />
    )}
    </>
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
