import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/Badge';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useQuotes } from '@/features/sales';
import { useSuppliers } from '@/features/suppliers';
import { useDesign } from '@/features/form-designs';
import { todayISO } from '@/shared/lib/format';
import { INSTALLATION_STATUSES } from './types';
import type { Installation, InstallationInsert } from './types';
import { DeliveryOrderPrintModal } from './pdf';

interface Props {
  installation: Installation | null;
  onClose: () => void;
  onSave: (row: InstallationInsert) => void;
  isSaving?: boolean;
  onDelete?: (id: string) => void;
  /** Quote ids already linked to another installation — excluded from the picker. */
  usedQuoteIds?: Set<string>;
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

export function InstallationModal({ installation, onClose, onSave, isSaving = false, onDelete, usedQuoteIds }: Props) {
  const isNew = !installation;
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: quotes = [] } = useQuotes();
  const { data: suppliers = [] } = useSuppliers();
  const { profile, design } = useDesign('delivery_order');

  // Installations are carried out by contractors. Active rows only — anything else
  // is dead weight in the picker. Existing rows whose tech name no longer matches
  // a contractor still surface in the legend (free-text fallback).
  const contractors = useMemo(
    () => suppliers.filter((s) => (s.kind ?? 'Supplier') === 'Contractor' && s.status === 'Active'),
    [suppliers]
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<InstallationInsert>(
    installation ?? {
      id: `INS-${String(Date.now()).slice(-4)}`,
      customer_id: '',
      product_id: null,
      quote_id: null,
      tech: '',
      scheduled: todayISO(),
      scheduled_time: null,
      status: 'Pending',
      notes: null,
      qty_overrides: {},
    }
  );

  // 48 half-hour slots, "00:00" … "23:30". Stored as HH:MM:SS by Postgres
  // 'time' type so we accept either form on read (slice to HH:MM for compare).
  const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2);
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
  });
  const currentTime = (form.scheduled_time ?? '').slice(0, 5); // strip seconds

  const setOverride = (index: number, value: number, originalQty: number) => {
    setForm((f) => {
      const next = { ...(f.qty_overrides ?? {}) };
      const key = String(index);
      if (value === originalQty) delete next[key];
      else next[key] = value;
      return { ...f, qty_overrides: next };
    });
  };

  // Only Case Won quotes are eligible, and only if they're not already linked
  // to another installation. When editing, keep the current row's own quote in
  // the list so it stays selectable.
  const eligibleQuotes = useMemo(
    () =>
      quotes.filter((q) => {
        if (q.status !== 'Case Won') return false;
        if (q.id === installation?.quote_id) return true;
        return !usedQuoteIds?.has(q.id);
      }),
    [quotes, usedQuoteIds, installation?.quote_id]
  );

  const linkedQuote = quotes.find((q) => q.id === form.quote_id) ?? null;
  const linkedCustomer = customers.find((c) => c.id === form.customer_id) ?? null;
  const productById = new Map(products.map((p) => [p.id, p]));

  const handleQuoteChange = (quoteId: string) => {
    const q = quotes.find((qq) => qq.id === quoteId);
    setForm((f) => ({
      ...f,
      quote_id: quoteId || null,
      customer_id: q?.customer_id ?? f.customer_id,
    }));
  };

  const canDownloadDO = !isNew && form.status === 'Completed' && !!profile && !!design;
  const [showPrint, setShowPrint] = useState(false);

  const valid = !!form.customer_id && !!form.tech.trim() && !!form.scheduled;

  return (
    <>
    <Modal title={isNew ? 'New Installation' : form.id} subtitle={!isNew ? `Status: ${form.status}` : undefined} onClose={onClose}>
      <div>
        <label style={labelStyle}>Linked Quotation / Proposal</label>
        <SearchableSelect
          options={eligibleQuotes.map((q) => {
            const customer = customers.find((c) => c.id === q.customer_id);
            return {
              value: q.id,
              label: `${q.id} · ${q.type}`,
              meta: `${customer?.name ?? q.customer_id} · ${q.status}`,
            };
          })}
          value={form.quote_id}
          onChange={(id) => handleQuoteChange(id ?? '')}
          placeholder="— Select a quote / proposal —"
          nullable
          nullLabel="— Select a quote / proposal —"
        />
        {!form.quote_id && (
          <div style={{ fontSize: 11, color: '#C0321A', marginTop: 6, fontWeight: 600 }}>
            An installation must be tied to a quotation or proposal.
          </div>
        )}
      </div>

      {linkedQuote && (
        <div style={{ background: C.seasalt, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
              {linkedCustomer?.name ?? linkedQuote.customer_id}
            </div>
            <Badge status={linkedQuote.status} />
          </div>
          <div style={{ fontSize: 11, color: C.slate }}>
            {linkedQuote.line_items.length} item(s) on this quote — adjust qty below if the delivered amount differs.
            Inventory is unaffected.
          </div>
          <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.seasalt }}>
                  {['Product', 'SKU', 'Quote Qty', 'Delivered Qty'].map((h) => (
                    <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedQuote.line_items.map((li, i) => {
                  const product = productById.get(li.product_id);
                  const overrides = form.qty_overrides ?? {};
                  const overridden = overrides[String(i)];
                  const delivered = overridden ?? li.qty;
                  const isOverridden = overridden !== undefined;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.divider}` }}>
                      <td style={{ padding: '7px 12px', fontWeight: 600 }}>{product?.name ?? li.product_id}</td>
                      <td style={{ padding: '7px 12px', color: C.slate, fontSize: 11 }}>{li.product_id}</td>
                      <td style={{ padding: '7px 12px', color: C.slate }}>{li.qty}</td>
                      <td style={{ padding: '5px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min="0"
                            value={delivered}
                            onChange={(e) => setOverride(i, parseInt(e.target.value, 10) || 0, li.qty)}
                            style={{
                              width: 70,
                              padding: '5px 8px',
                              borderRadius: 8,
                              border: `1px solid ${isOverridden ? '#B07D00' : C.border}`,
                              background: isOverridden ? '#FFF8E1' : C.white,
                              fontFamily: 'Figtree',
                              fontSize: 12,
                              fontWeight: 700,
                              color: isOverridden ? '#B07D00' : '#1a1a1a',
                              outline: 'none',
                              textAlign: 'center',
                            }}
                          />
                          {isOverridden && (
                            <button
                              type="button"
                              onClick={() => setOverride(i, li.qty, li.qty)}
                              title="Reset to quote qty"
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: C.slate,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 2,
                              }}
                            >
                              ↺ Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Contractor</label>
          <SearchableSelect
            options={contractors.map((c) => ({ value: c.name, label: c.name, meta: c.category }))}
            value={form.tech || null}
            onChange={(name) => setForm((f) => ({ ...f, tech: name ?? '' }))}
            placeholder="— Select a contractor —"
            nullable
            nullLabel="— Select a contractor —"
          />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Scheduled Date</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={form.scheduled}
              onChange={(e) => setForm((f) => ({ ...f, scheduled: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={currentTime}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_time: e.target.value || null }))}
              style={{ ...inputStyle, width: 140, flexShrink: 0, paddingRight: 28 }}
              title="Time (30-min increments)"
            >
              <option value="">— time —</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Status</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {INSTALLATION_STATUSES.map((s) => {
              const active = form.status === s;
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

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Site Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            rows={3}
            placeholder="Access instructions, parking, contact on site…"
            style={{ ...inputStyle, padding: '10px 12px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'Figtree' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>
                Permanent — cannot be undone.
              </span>
              <button
                onClick={() => onDelete(installation.id)}
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

        {canDownloadDO && (
          <button
            onClick={() => setShowPrint(true)}
            style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            ⤓ Download Delivery Order
          </button>
        )}

        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!valid || !form.quote_id || isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !valid || !form.quote_id || isSaving ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: isSaving ? 'wait' : (!valid || !form.quote_id ? 'not-allowed' : 'pointer'),
            opacity: isSaving ? 0.8 : 1,
          }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Create Installation' : 'Save Changes'}
        </button>
      </div>
    </Modal>

    {showPrint && installation && (
      <DeliveryOrderPrintModal installation={installation} onClose={() => setShowPrint(false)} />
    )}
    </>
  );
}
