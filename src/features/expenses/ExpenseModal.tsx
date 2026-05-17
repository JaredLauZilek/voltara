import { useState } from 'react';
import { C } from '@/shared/tokens';
import { supabase } from '@/shared/lib/supabase';
import { Modal } from '@/shared/components/Modal';
import { todayISO } from '@/shared/lib/format';
import { AttachmentsField } from '@/shared/components/AttachmentsField';
import { fetchMyrRate } from '@/shared/lib/fxRate';
import { ExpenseEntityPicker } from './ExpenseEntityPicker';
import { ExpenseCategoryPicker } from './ExpenseCategoryPicker';
import { InvoicePrefillField } from './components/InvoicePrefillField';
import { PeriodInvoicePrefillField } from './components/PeriodInvoicePrefillField';
import type { ParsedExpenseInvoice } from './lib/parseInvoice';
import type { Attachment } from '@/shared/types';
import {
  EXPENSE_CURRENCIES,
  EXPENSE_STATUSES,
  RECURRENCE_FREQUENCIES,
} from './types';
import type { ExpenseCurrency } from './types';
import type {
  Expense,
  ExpenseInsert,
  ExpensePeriod,
  ExpenseStatus,
  RecurrenceFrequency,
} from './types';

interface Props {
  expense: Expense | null;
  onClose: () => void;
  onSave: (row: ExpenseInsert) => void;
  onDelete?: (id: string, attachments: Expense['attachments']) => void;
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

function newExpenseId(): string {
  return `EXP-${String(Date.now()).slice(-6)}`;
}

function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function advancePeriod(period: string, freq: RecurrenceFrequency): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  if (freq === 'Weekly') d.setDate(d.getDate() + 7);
  if (freq === 'Monthly') d.setMonth(d.getMonth() + 1);
  if (freq === 'Quarterly') d.setMonth(d.getMonth() + 3);
  if (freq === 'Yearly') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 7);
}

export function ExpenseModal({ expense, onClose, onSave, onDelete }: Props) {
  const isNew = !expense;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<ExpenseInsert>(
    expense ?? {
      id: newExpenseId(),
      expense_date: todayISO(),
      category: 'Other',
      payee: null,
      payee_email: null,
      supplier_id: null,
      entity: null,
      amount: 0,
      currency: 'RM',
      payment_method: null,
      reference: null,
      recurrence: 'None',
      status: 'Paid',
      paid_on: todayISO(),
      attachments: [],
      periods: [],
      notes: null,
    }
  );

  const isRecurring = form.recurrence !== 'None';
  const valid = form.amount >= 0 && !!form.expense_date;

  const setRecurringToggle = (on: boolean) => {
    setForm((f) => {
      if (on) {
        const nextRecurrence = (f.recurrence ?? 'None') !== 'None' ? f.recurrence! : 'Monthly';
        const periods = f.periods?.length ? f.periods : [{
          period: f.expense_date.slice(0, 7),
          status: 'Pending' as ExpenseStatus,
          paid_on: null,
          attachments: [],
          amount: null,
          reference: null,
        }];
        return { ...f, recurrence: nextRecurrence, periods };
      }
      return { ...f, recurrence: 'None' };
    });
  };

  const setFrequency = (freq: RecurrenceFrequency) => {
    setForm((f) => ({ ...f, recurrence: freq }));
  };

  const addNextPeriod = () => {
    setForm((f) => {
      const periods = f.periods ?? [];
      const freq = (f.recurrence ?? 'Monthly') as RecurrenceFrequency;
      const lastPeriod = periods.length > 0
        ? periods[periods.length - 1].period
        : f.expense_date.slice(0, 7);
      const next: ExpensePeriod = {
        period: advancePeriod(lastPeriod, freq),
        status: 'Pending',
        paid_on: null,
        attachments: [],
        amount: null,
        reference: null,
      };
      return { ...f, periods: [...periods, next] };
    });
  };

  const updatePeriod = (i: number, patch: Partial<ExpensePeriod>) => {
    setForm((f) => ({
      ...f,
      periods: (f.periods ?? []).map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    }));
  };

  const removePeriod = (i: number) => {
    setForm((f) => ({
      ...f,
      periods: (f.periods ?? []).filter((_, idx) => idx !== i),
    }));
  };

  const handleStatusChange = (status: ExpenseStatus) => {
    setForm((f) => {
      const patch: Partial<ExpenseInsert> = { status };
      // Default Paid-on to the expense date (the date on the invoice) rather
      // than today — that's almost always what bookkeeping actually wants.
      if (status === 'Paid' && !f.paid_on) patch.paid_on = f.expense_date || todayISO();
      if (status !== 'Paid') patch.paid_on = null;
      return { ...f, ...patch };
    });
  };

  // Treat the first attachment as the "prefill" file when present — same
  // heuristic the Bills modal uses. The drop-zone watches this so the user
  // can see what was attached and replace it.
  const prefillAttachment = (form.attachments ?? [])[0] ?? null;

  const handleInvoiceApply = ({ fields, attachment }: { fields: ParsedExpenseInvoice; attachment: Attachment }) => {
    setForm((f) => {
      const next: ExpenseInsert = {
        ...f,
        attachments: [attachment, ...(f.attachments ?? [])],
      };
      if (fields.amount !== null) next.amount = fields.amount;
      if (fields.expense_date) {
        next.expense_date = fields.expense_date;
        // Paid invoices are typically paid the same day they're dated — keep
        // paid_on in sync with the invoice date when prefilling. (The default
        // paid_on is today, so guarding on `!f.paid_on` would never fire.)
        if (next.status === 'Paid') next.paid_on = fields.expense_date;
      }
      if (fields.reference) next.reference = fields.reference;
      if (fields.entity) next.entity = fields.entity;
      if (fields.category) next.category = fields.category;
      if (fields.currency) next.currency = fields.currency;
      return next;
    });
  };

  const handleInvoiceClear = async () => {
    if (!prefillAttachment) return;
    await supabase.storage.from('attachments').remove([prefillAttachment.storage_path]);
    setForm((f) => ({
      ...f,
      attachments: (f.attachments ?? []).filter((a) => a.storage_path !== prefillAttachment.storage_path),
    }));
  };

  const periods = form.periods ?? [];

  // Snapshot the MYR rate for `expense_date` (top-level) and `paid_on` (per
  // Paid period) at save time. Frankfurter is hit once per distinct
  // (currency, date) pair — usually 1–N small calls. We always re-fetch on
  // save so changing the date or currency picks up the right historical rate.
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const next: ExpenseInsert = { ...form };

      if (next.currency && next.currency !== 'RM') {
        next.myr_rate = await fetchMyrRate(next.currency, next.expense_date);
      } else {
        next.myr_rate = null;
      }

      if (next.recurrence !== 'None' && next.periods) {
        next.periods = await Promise.all(
          next.periods.map(async (p) => {
            if (next.currency && next.currency !== 'RM' && p.status === 'Paid' && p.paid_on) {
              const rate = await fetchMyrRate(next.currency, p.paid_on);
              return { ...p, myr_rate: rate };
            }
            return { ...p, myr_rate: null };
          }),
        );
      }

      onSave(next);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'New Expense' : form.id}
      subtitle={!isNew ? `${form.category}${form.entity ? ` · ${form.entity}` : ''}` : undefined}
      onClose={onClose}
    >
      {/* Invoice / receipt auto-fill — drops a file, parses via Anthropic
          vision, applies fields + attaches the file as form.attachments[0].
          Hidden for recurring expenses since those track many period-level
          invoices, not a single one. */}
      {!isRecurring && (
        <InvoicePrefillField
          storagePath={`expenses/${form.id}`}
          onApply={handleInvoiceApply}
          attached={prefillAttachment}
          onClear={handleInvoiceClear}
        />
      )}

      {/* Recurring toggle row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 14px',
          background: isRecurring ? C.honeydew : C.seasalt,
          borderRadius: 12,
          border: `1px solid ${isRecurring ? C.green : C.border}`,
          flexWrap: 'wrap',
          transition: 'background 100ms, border-color 100ms',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setRecurringToggle(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: C.green, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: isRecurring ? C.green : '#1a1a1a' }}>
            This is a recurring expense
          </span>
        </label>
        {isRecurring && (
          <>
            <span style={{ fontSize: 12, color: C.slate, fontWeight: 600 }}>Repeats:</span>
            <select
              value={form.recurrence === 'None' ? 'Monthly' : form.recurrence}
              onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontWeight: 700 }}
            >
              {RECURRENCE_FREQUENCIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Main fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>{isRecurring ? 'Start Date' : 'Expense Date'}</label>
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm((f) => {
              const next = e.target.value;
              // Slide Paid-on along with Expense Date while it's still mirroring
              // the previous value (the user hasn't intentionally diverged it).
              const shouldSlidePaidOn = f.status === 'Paid' && f.paid_on === f.expense_date;
              return {
                ...f,
                expense_date: next,
                paid_on: shouldSlidePaidOn ? next : f.paid_on,
              };
            })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <ExpenseCategoryPicker
            value={form.category}
            onChange={(next) => setForm((f) => ({ ...f, category: next }))}
          />
        </div>

        <div>
          <label style={labelStyle}>Entity</label>
          <ExpenseEntityPicker
            value={form.entity}
            onChange={(next) => setForm((f) => ({ ...f, entity: next }))}
          />
        </div>
        <div>
          <label style={labelStyle}>
            {isRecurring ? `Amount per period (${form.currency})` : `Amount (${form.currency})`}
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as ExpenseCurrency }))}
              style={{ ...inputStyle, width: 84, fontWeight: 700 }}
              title="Bill currency — non-RM amounts are converted to MYR for KPI totals using the FX rate snapshotted at the expense date."
            >
              {EXPENSE_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {form.currency !== 'RM' && form.myr_rate != null && (
            <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
              Rate · 1 {form.currency} = RM {Number(form.myr_rate).toFixed(4)} (snapshotted {form.expense_date})
            </div>
          )}
          {form.currency !== 'RM' && form.myr_rate == null && (
            <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
              Rate will be fetched from frankfurter.app on save.
            </div>
          )}
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Invoice / Receipt Reference</label>
          <input
            value={form.reference ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value || null }))}
            style={inputStyle}
            placeholder="e.g. INV-2026-04-1839"
          />
        </div>
      </div>

      {/* One-off-only fields */}
      {!isRecurring && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EXPENSE_STATUSES.map((s) => {
                  const active = form.status === s;
                  return (
                    <button
                      key={s}
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
            </div>
            <div>
              <label style={labelStyle}>Paid On</label>
              <input
                type="date"
                value={form.paid_on ?? ''}
                onChange={(e) => {
                  const next = e.target.value || null;
                  setForm((f) => ({
                    ...f,
                    paid_on: next,
                    // setting a paid date implies the expense is paid; clearing leaves status alone
                    status: next && f.status !== 'Paid' ? 'Paid' : f.status,
                  }));
                }}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Attachments</label>
            <AttachmentsField
              value={form.attachments ?? []}
              onChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
              storagePath={`expenses/${form.id}`}
            />
          </div>
        </>
      )}

      {/* Recurring-only fields: per-period editors */}
      {isRecurring && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Periods ({periods.length})</label>
            <button
              onClick={addNextPeriod}
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                border: `1px solid ${C.green}`,
                background: 'transparent',
                color: C.green,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add Period
            </button>
          </div>
          {periods.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: C.slate, fontSize: 12, background: C.seasalt, borderRadius: 10 }}>
              No periods yet. Click "+ Add Period" to track an occurrence.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {periods.map((p, i) => (
              <PeriodEditor
                key={i}
                period={p}
                baselineAmount={form.amount}
                baselineCurrency={form.currency}
                onChange={(patch) => updatePeriod(i, patch)}
                onRemove={() => removePeriod(i)}
                storagePath={`expenses/${form.id}/period-${p.period}`}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={3}
          placeholder="Internal notes about this expense…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button
                onClick={() => onDelete(expense.id, expense.attachments ?? [])}
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
          onClick={handleSave}
          disabled={!valid || isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !valid || isSaving ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: !valid ? 'not-allowed' : isSaving ? 'wait' : 'pointer',
          }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Create Expense' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

function PeriodEditor({
  period,
  baselineAmount,
  baselineCurrency,
  onChange,
  onRemove,
  storagePath,
}: {
  period: ExpensePeriod;
  /** Parent expense's `amount` — shown as the period's amount placeholder
   *  when the period has no override, and used as the fallback elsewhere. */
  baselineAmount: number;
  /** Parent expense's `currency` — periods inherit it (no per-period currency
   *  override); used here only for label / placeholder formatting. */
  baselineCurrency: ExpenseCurrency;
  onChange: (patch: Partial<ExpensePeriod>) => void;
  onRemove: () => void;
  storagePath: string;
}) {
  const [periodInput, setPeriodInput] = useState(period.period);
  const [amountDraft, setAmountDraft] = useState<string>(
    period.amount !== null && period.amount !== undefined ? String(period.amount) : '',
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const hasData = period.status !== 'Pending' || !!period.paid_on || (period.attachments?.length ?? 0) > 0;

  const handleStatus = (status: ExpenseStatus) => {
    const patch: Partial<ExpensePeriod> = { status };
    if (status === 'Paid' && !period.paid_on) patch.paid_on = todayISO();
    if (status !== 'Paid') patch.paid_on = null;
    onChange(patch);
  };

  const handleAmountChange = (raw: string) => {
    setAmountDraft(raw);
    if (raw.trim() === '') {
      onChange({ amount: null });
      return;
    }
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) onChange({ amount: n });
  };

  /** Receives parsed fields from the per-period AI drop-zone. Writes ONLY to
   *  this period; entity/category stay locked at the parent. */
  const handlePeriodApply = ({
    fields,
    attachment,
  }: {
    fields: { amount: number | null; expense_date: string | null; reference: string | null };
    attachment: import('@/shared/types').Attachment;
  }) => {
    const patch: Partial<ExpensePeriod> = {
      attachments: [attachment, ...(period.attachments ?? [])],
      status: 'Paid',
    };
    if (fields.amount !== null) {
      patch.amount = fields.amount;
      setAmountDraft(String(fields.amount));
    }
    if (fields.reference) patch.reference = fields.reference;
    if (fields.expense_date) patch.paid_on = fields.expense_date;
    else if (!period.paid_on) patch.paid_on = todayISO();
    onChange(patch);
  };

  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
            {formatPeriodLabel(period.period)}
          </span>
          <input
            type="month"
            value={periodInput}
            onChange={(e) => {
              setPeriodInput(e.target.value);
              if (e.target.value) onChange({ period: e.target.value });
            }}
            style={{ ...inputStyle, padding: '4px 8px', width: 130, fontSize: 12 }}
          />
        </div>
        {confirmRemove ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#C0321A', fontWeight: 600 }}>
              {hasData ? 'Remove this period and its attachments?' : 'Remove this period?'}
            </span>
            <button
              onClick={onRemove}
              style={{ padding: '4px 10px', borderRadius: 8, border: 'none', background: '#C0321A', color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Figtree' }}
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Figtree' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            style={{ border: 'none', background: 'transparent', color: '#C0321A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Figtree' }}
          >
            Remove
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>Status</label>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {EXPENSE_STATUSES.map((s) => {
              const active = period.status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 99,
                    border: `2px solid ${active ? C.green : C.border}`,
                    background: active ? C.honeydew : C.white,
                    color: active ? C.green : C.slate,
                    fontFamily: 'Figtree',
                    fontSize: 11,
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
          <label style={{ ...labelStyle, fontSize: 10 }}>Paid On</label>
          <input
            type="date"
            value={period.paid_on ?? ''}
            onChange={(e) => {
              const next = e.target.value || null;
              const patch: Partial<ExpensePeriod> = { paid_on: next };
              if (next && period.status !== 'Paid') patch.status = 'Paid';
              onChange(patch);
            }}
            style={{ ...inputStyle, padding: '6px 10px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>Amount ({baselineCurrency})</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amountDraft}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={baselineAmount.toFixed(2)}
            style={{ ...inputStyle, padding: '6px 10px' }}
          />
          <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
            {period.amount === null || period.amount === undefined
              ? `Uses default · ${baselineCurrency} ${baselineAmount.toFixed(2)}`
              : `Override · default is ${baselineCurrency} ${baselineAmount.toFixed(2)}`}
          </div>
        </div>
        <div>
          <label style={{ ...labelStyle, fontSize: 10 }}>Reference</label>
          <input
            value={period.reference ?? ''}
            onChange={(e) => onChange({ reference: e.target.value || null })}
            placeholder="Per-period invoice ref"
            style={{ ...inputStyle, padding: '6px 10px' }}
          />
        </div>
      </div>

      <div>
        <label style={{ ...labelStyle, fontSize: 10 }}>Invoice / Receipt for {formatPeriodLabel(period.period)}</label>
        <PeriodInvoicePrefillField
          storagePath={storagePath}
          attachments={period.attachments ?? []}
          onAttachmentsChange={(next) => onChange({ attachments: next })}
          onApply={handlePeriodApply}
          baselineCurrency={baselineCurrency}
        />
      </div>
    </div>
  );
}
