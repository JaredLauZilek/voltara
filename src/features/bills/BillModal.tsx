import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { AttachmentsField } from '@/shared/components/AttachmentsField';
import { SupplierPicker } from '@/features/suppliers';
import { useSuppliers } from '@/features/suppliers';
import { todayISO } from '@/shared/lib/format';
import { BILL_CATEGORIES, BILL_STATUSES, BILL_PAYMENT_METHODS, BILL_CURRENCIES } from './types';
import type { BillCurrency } from './types';
import type { Bill, BillInsert } from './types';

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
    setForm((f) => ({ ...f, supplier_id: id, vendor: s?.name ?? f.vendor }));
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
        <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Bill['category'] }))} style={inputStyle}>
          {BILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
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

      {/* Attachments */}
      <div>
        <label style={labelStyle}>Vendor Invoice Attachments</label>
        <AttachmentsField
          value={form.attachments ?? []}
          onChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
          storagePath={`bills/${form.id}`}
          label="invoice"
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
