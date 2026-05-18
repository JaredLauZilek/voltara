import { useEffect, useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { AttachmentsField } from '@/shared/components/AttachmentsField';
import { ProductPicker, useProducts } from '@/features/products';
import { useCustomers } from '@/features/customers';
import { useQuotes } from '@/features/sales';
import type { LineItem } from '@/shared/types';
import { todayISO } from '@/shared/lib/format';
import { SO_STATUSES, calcSOTotal } from './types';
import type { SalesOrder, SalesOrderInsert } from './types';
import { useSalesOrders } from './hooks';

interface Props {
  so: SalesOrder | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (row: SalesOrderInsert) => void;
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

export function SalesOrderModal({ so, isSaving = false, onClose, onSave, onDelete }: Props) {
  const isNew = !so;
  const { data: products = [] } = useProducts();
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const { data: existingSOs = [] } = useSalesOrders();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<SalesOrderInsert>(
    so ?? {
      // Server-assigned via fn_assign_id('SO') — placeholder here is just to
      // satisfy NOT NULL until insert; stripId() drops it before the call.
      id: `SO-NEW-${String(Date.now()).slice(-4)}`,
      quote_id: '',
      customer_id: '',
      customer_po_ref: '',
      customer_po_date: todayISO(),
      line_items: [],
      discount: 0,
      notes: null,
      status: 'Open',
      attachments: [],
      created_date: todayISO(),
    },
  );

  // Quotes that are eligible to be promoted to an SO:
  //   - status must be Case Won (we only fulfil accepted quotes)
  //   - not already claimed by another SO (UNIQUE(quote_id) at DB level)
  // When editing, the current SO's quote stays in the list.
  const claimedQuoteIds = useMemo(() => {
    const set = new Set(existingSOs.map((s) => s.quote_id));
    if (so?.quote_id) set.delete(so.quote_id);
    return set;
  }, [existingSOs, so?.quote_id]);

  const eligibleQuotes = useMemo(
    () => quotes.filter((q) => q.status === 'Case Won' && !claimedQuoteIds.has(q.id)),
    [quotes, claimedQuoteIds],
  );

  const linkedQuote = quotes.find((q) => q.id === form.quote_id) ?? null;
  const linkedCustomer = customers.find((c) => c.id === form.customer_id) ?? null;

  const handleQuoteChange = (quoteId: string | null) => {
    if (!quoteId) {
      setForm((f) => ({ ...f, quote_id: '', customer_id: '', line_items: [], discount: 0 }));
      return;
    }
    const q = quotes.find((qq) => qq.id === quoteId);
    if (!q) return;
    setForm((f) => ({
      ...f,
      quote_id: q.id,
      customer_id: q.customer_id,
      // Snapshot line items + discount from the quote. User can still edit
      // qty / unit price below before saving for partial-fulfilment cases.
      line_items: q.line_items,
      discount: q.discount ?? 0,
      // Inherit notes once, only when creating a new SO. Don't overwrite an
      // existing SO's notes if the user later changes quotes (rare flow).
      notes: f.notes ?? q.notes ?? null,
    }));
  };

  // Reset confirmDelete flag whenever the modal target changes.
  useEffect(() => setConfirmDelete(false), [so?.id]);

  const total = calcSOTotal(form.line_items ?? [], form.discount ?? 0);

  const updateItem = (i: number, patch: Partial<LineItem>) =>
    setForm((f) => ({
      ...f,
      line_items: (f.line_items ?? []).map((li, idx) => (idx === i ? { ...li, ...patch } : li)),
    }));
  const addItem = () => {
    const first = products[0];
    setForm((f) => ({
      ...f,
      line_items: [
        ...(f.line_items ?? []),
        { product_id: first?.id ?? '', qty: 1, unit_price_snapshot: first?.price ?? 0 },
      ],
    }));
  };
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, line_items: (f.line_items ?? []).filter((_, idx) => idx !== i) }));
  const onProductChange = (i: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    updateItem(i, {
      product_id: productId,
      unit_price_snapshot: p?.price ?? 0,
      description: p?.description ?? '',
    });
  };

  const canSave =
    !!form.quote_id &&
    !!form.customer_id &&
    !!form.customer_po_ref.trim() &&
    !!form.customer_po_date &&
    (form.line_items ?? []).length > 0;

  // Storage path prefix for AttachmentsField. The DB row's id is server-assigned
  // so for unsaved SOs we use a temporary "new" folder — files there get
  // re-keyed implicitly on save (the path is stored verbatim on the attachment).
  const storagePath = `sales_orders/${isNew ? 'new' : so!.id}`;

  return (
    <Modal
      title={isNew ? 'New Sales Order' : so!.id}
      subtitle={!isNew ? `Status: ${so!.status} · ${so!.created_date}` : undefined}
      onClose={onClose}
    >
      <div>
        <label style={labelStyle}>Linked Quote (Case Won) *</label>
        <SearchableSelect
          options={eligibleQuotes.map((q) => {
            const c = customers.find((x) => x.id === q.customer_id);
            // Quote total isn't stored — derive from line_items / discount so
            // the picker meta line shows the value the customer accepted.
            const quoteTotal = calcSOTotal(q.line_items, q.discount ?? 0);
            return {
              value: q.id,
              label: `${q.id} · ${q.type}`,
              meta: `${c?.name ?? q.customer_id} · RM ${quoteTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            };
          })}
          value={form.quote_id || null}
          onChange={(id) => handleQuoteChange(id)}
          placeholder="— Select a Case Won quote —"
          nullable
          nullLabel="— Select a Case Won quote —"
          disabled={!isNew}
        />
        {isNew && !form.quote_id && (
          <div style={{ fontSize: 11, color: '#C0321A', marginTop: 6, fontWeight: 600 }}>
            A sales order must be tied to a Case Won quote.
          </div>
        )}
      </div>

      {linkedQuote && (
        <div style={{ background: C.seasalt, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
              {linkedCustomer?.name ?? linkedQuote.customer_id}
            </div>
            <div style={{ fontSize: 11, color: C.slate }}>
              Case Won · {linkedQuote.line_items.length} item(s)
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Customer PO Ref *</label>
          <input
            type="text"
            value={form.customer_po_ref}
            onChange={(e) => setForm((f) => ({ ...f, customer_po_ref: e.target.value }))}
            placeholder="e.g. PO-CHEMPLAS-2026-0042"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Customer PO Date *</label>
          <input
            type="date"
            value={form.customer_po_date}
            onChange={(e) => setForm((f) => ({ ...f, customer_po_date: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Status</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SO_STATUSES.map((s) => {
            const active = (form.status ?? 'Open') === s;
            return (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `2px solid ${active ? C.green : C.border}`,
                  background: active ? C.honeydew : C.white,
                  color: active ? C.green : C.slate,
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
        <label style={labelStyle}>Line Items</label>
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Product', 'Qty', 'Unit Price (RM)', 'Total', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.slate,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(form.line_items ?? []).map((li, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.divider}` }}>
                  <td style={{ padding: '6px 12px', minWidth: 220 }}>
                    <ProductPicker
                      value={li.product_id || null}
                      onChange={(id) => onProductChange(i, id ?? '')}
                    />
                  </td>
                  <td style={{ padding: '6px 12px', width: 80 }}>
                    <input
                      type="number"
                      min="0"
                      value={li.qty}
                      onChange={(e) => updateItem(i, { qty: parseInt(e.target.value, 10) || 0 })}
                      style={{ ...inputStyle, padding: '6px 8px', textAlign: 'center' }}
                    />
                  </td>
                  <td style={{ padding: '6px 12px', width: 130 }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={li.unit_price_snapshot}
                      onChange={(e) => updateItem(i, { unit_price_snapshot: parseFloat(e.target.value) || 0 })}
                      style={{ ...inputStyle, padding: '6px 8px', textAlign: 'right' }}
                    />
                  </td>
                  <td style={{ padding: '6px 12px', fontWeight: 700, color: C.green, whiteSpace: 'nowrap' }}>
                    RM {(li.qty * li.unit_price_snapshot).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => removeItem(i)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#C0321A',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: 4,
                      }}
                      title="Remove line"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          onClick={addItem}
          style={{
            marginTop: 8,
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px dashed ${C.border}`,
            background: 'transparent',
            color: C.slate,
            fontFamily: 'Figtree',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Line
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Discount (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.discount ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: C.honeydew,
              color: C.green,
              fontFamily: 'Figtree',
              fontWeight: 700,
              fontSize: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Order Total</span>
            <span>RM {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Customer PO Document</label>
        <AttachmentsField
          value={form.attachments ?? []}
          onChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
          storagePath={storagePath}
          maxFiles={3}
          label="customer PO"
        />
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={3}
          placeholder="Delivery instructions, customer-specific terms, internal notes…"
          style={{ ...inputStyle, padding: '10px 12px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'Figtree' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>
                Permanent — cannot be undone.
              </span>
              <button
                onClick={() => onDelete(so!.id)}
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
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: isSaving ? 'wait' : (!canSave ? 'not-allowed' : 'pointer'),
            opacity: isSaving ? 0.8 : 1,
          }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Create Sales Order' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
