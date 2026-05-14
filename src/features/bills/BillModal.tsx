import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { supabase } from '@/shared/lib/supabase';
import { AttachmentsField } from '@/shared/components/AttachmentsField';
import { SupplierPicker } from '@/features/suppliers';
import { useSuppliers } from '@/features/suppliers';
import { todayISO } from '@/shared/lib/format';
import { BILL_STATUSES, BILL_PAYMENT_METHODS, BILL_CURRENCIES } from './types';
import { BillCategoryPicker } from './BillCategoryPicker';
import { InvoicePrefillField } from './components/InvoicePrefillField';
import type { ParsedInvoice } from './lib/parseInvoice';
import type { BillCurrency } from './types';
import type { Bill, BillInsert } from './types';
import type { Attachment } from '@/shared/types';

interface Props {
  bill: Bill | null;
  onClose: () => void;
  onSave: (row: BillInsert) => void;
  onDelete?: (id: string, attachments: Bill['attachments']) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
  background: '#fff',
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

export function BillModal({ bill, onClose, onSave, onDelete }: Props) {
  const isNew = !bill;
  const { data: suppliers = [] } = useSuppliers();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<BillInsert>(
    bill ?? {
      id: `BILL-${String(Date.now()).slice(-6)}`,
      bill_date: todayISO(),
      due_date: null,
      category: 'Installation',
      vendor: '',
      vendor_email: null,
      supplier_id: null,
      quote_id: null,
      amount: 0,
      tax: 0,
      currency: 'RM',
      payment_method: null,
      reference: null,
      status: 'Unpaid',
      paid_on: null,
      attachments: [],
      notes: null,
    }
  );

  const currency: BillCurrency = (form.currency ?? 'RM') as BillCurrency;

  const handleSupplierChange = (id: string) => {
    const s = suppliers.find((x) => x.id === id);
    setForm((f) => {
      const next: BillInsert = { ...f, supplier_id: id, vendor: s?.name ?? f.vendor };
      // Auto-derive due_date from the supplier's payment terms when one isn't
      // already set — never overwrite a date the user has typed in manually.
      if (!f.due_date) {
        const derived = dueDateFromTerms(f.bill_date, s?.payment_terms);
        if (derived) next.due_date = derived;
      }
      return next;
    });
  };

  /** Wire the invoice-prefill output into the form. Only overwrites a field
   *  when the parser produced a value, so user edits don't get clobbered if
   *  they uploaded → tweaked → re-uploaded. */
  const handleInvoiceApply = ({ fields, attachment }: { fields: ParsedInvoice; attachment: Attachment }) => {
    setForm((f) => {
      const next: BillInsert = { ...f };
      if (fields.amount !== null)     next.amount = fields.amount;
      if (fields.tax !== null)        next.tax = fields.tax;
      if (fields.currency)            next.currency = fields.currency;
      if (fields.bill_date)           next.bill_date = fields.bill_date;
      if (fields.due_date)            next.due_date = fields.due_date;
      if (fields.reference)           next.reference = fields.reference;
      if (fields.supplier_id) {
        next.supplier_id = fields.supplier_id;
        const s = suppliers.find((x) => x.id === fields.supplier_id);
        if (s) next.vendor = s.name;
        // If the invoice didn't carry an explicit due date, fall back to the
        // supplier's payment-terms-derived one.
        if (!next.due_date && s?.payment_terms) {
          const derived = dueDateFromTerms(next.bill_date, s.payment_terms);
          if (derived) next.due_date = derived;
        }
      } else if (fields.vendor_guess) {
        next.vendor = fields.vendor_guess;
      }
      next.attachments = [attachment, ...(f.attachments ?? []).slice(1)];
      return next;
    });
  };

  const handleInvoiceClear = async () => {
    // Remove the current primary attachment from Storage to avoid orphan files.
    const head = form.attachments?.[0];
    if (head) {
      try {
        await supabase.storage.from('attachments').remove([head.storage_path]);
      } catch {
        // Non-fatal — file might already be gone.
      }
    }
    setForm((f) => ({ ...f, attachments: (f.attachments ?? []).slice(1) }));
  };

  const handleStatusChange = (s: Bill['status']) => {
    setForm((f) => ({
      ...f,
      status: s,
      paid_on: s === 'Paid' && !f.paid_on ? todayISO() : s !== 'Paid' ? null : f.paid_on,
    }));
  };

  const dueBeforeBill = !!form.due_date && form.due_date < form.bill_date;
  const canSave = form.amount > 0 && !!form.supplier_id && !dueBeforeBill;

  return (
    <Modal title={isNew ? 'New Bill' : bill.id} onClose={onClose}>
      {/* Vendor invoice — drop here to auto-fill the fields below */}
      <InvoicePrefillField
        storagePath={`bills/${form.id}`}
        attached={form.attachments?.[0] ?? null}
        onApply={handleInvoiceApply}
        onClear={handleInvoiceClear}
      />

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Bill Date</label>
          <input type="date" value={form.bill_date} onChange={(e) => setForm((f) => ({ ...f, bill_date: e.target.value }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value || null }))}
            style={{ ...inputStyle, borderColor: dueBeforeBill ? C.error : C.border }}
          />
          {dueBeforeBill && (
            <div style={{ fontSize: 11, color: C.error, marginTop: 4, fontWeight: 600 }}>
              Due date can't be before the bill date.
            </div>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label style={labelStyle}>Category</label>
        <BillCategoryPicker
          value={form.category}
          onChange={(name) => setForm((f) => ({ ...f, category: name }))}
        />
      </div>

      {/* Supplier */}
      <div>
        <label style={labelStyle}>Supplier / Vendor / Contractor <span style={{ color: '#C0321A' }}>*</span></label>
        <SupplierPicker
          value={form.supplier_id}
          onChange={handleSupplierChange}
          placeholder="— Select a supplier, vendor or contractor —"
          filterKinds={['Supplier', 'Vendor', 'Contractor']}
        />
      </div>

      {/* Amount + Currency */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
        <div>
          <label style={labelStyle}>Amount ({currency}) <span style={{ color: '#C0321A' }}>*</span></label>
          <input
            type="number"
            min="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select
            value={currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as BillCurrency }))}
            style={inputStyle}
          >
            {BILL_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Payment + Reference */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Payment Method</label>
          <select value={form.payment_method ?? ''} onChange={(e) => setForm((f) => ({ ...f, payment_method: (e.target.value || null) as Bill['payment_method'] }))} style={inputStyle}>
            <option value="">— Not specified —</option>
            {BILL_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Vendor Invoice Ref #</label>
          <input
            value={form.reference ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value || null }))}
            placeholder="e.g. INV-2026-0042"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Status + Paid On */}
      <div>
        <label style={labelStyle}>Status</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {BILL_STATUSES.map((s) => {
            const active = form.status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
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
        {form.status === 'Paid' && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Paid On</label>
            <input type="date" value={form.paid_on ?? ''} onChange={(e) => setForm((f) => ({ ...f, paid_on: e.target.value || null }))} style={{ ...inputStyle, width: 'auto' }} />
          </div>
        )}
      </div>

      {/* Attachments — manual multi-file upload (works alongside the prefill
          drop-zone at the top of the modal). Both fields read/write the same
          form.attachments array, so an invoice applied via prefill shows up
          here too and can be removed from either place. */}
      <div>
        <label style={labelStyle}>Attachments</label>
        <AttachmentsField
          value={form.attachments ?? []}
          onChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
          storagePath={`bills/${form.id}`}
          label="file"
        />
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button onClick={() => onDelete(bill.id, bill.attachments)} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0321A', color: '#fff', fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Confirm Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          )
        )}
        <button onClick={onClose} style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        <button
          onClick={() => onSave(form)}
          disabled={!canSave}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: canSave ? C.green : C.slate, color: C.white, fontSize: 13, fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed' }}
        >
          {isNew ? 'Create Bill' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

/** Extracts a payment-term length in days from a free-text terms string.
 *  Accepts: "Net 30", "30 days", "Due in 14 days", "COD", "Due on receipt",
 *  "Immediate", "PIA". Returns null when the string can't be confidently
 *  interpreted, so callers can leave due_date alone. */
function paymentTermsDays(terms: string | null | undefined): number | null {
  if (!terms) return null;
  const s = terms.toLowerCase().trim();
  if (/\b(cod|due\s*on\s*receipt|immediate|on\s*receipt|pia|prepaid|paid\s*in\s*advance)\b/.test(s)) {
    return 0;
  }
  const m = s.match(/(\d{1,3})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 0 || n > 365) return null;
  return n;
}

/** Adds `paymentTermsDays(terms)` to `billDate` (ISO YYYY-MM-DD) and returns
 *  the result as ISO, or null if we can't compute one. */
function dueDateFromTerms(billDate: string, terms: string | null | undefined): string | null {
  const days = paymentTermsDays(terms);
  if (days === null) return null;
  const d = new Date(billDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
