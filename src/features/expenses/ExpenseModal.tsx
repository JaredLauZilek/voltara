import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { todayISO } from '@/shared/lib/format';
import { AttachmentsField } from '@/shared/components/AttachmentsField';
import {
  EMPLOYEE_CATEGORIES,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  PAYMENT_METHODS,
  RECURRENCE_FREQUENCIES,
} from './types';
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
  const [form, setForm] = useState<ExpenseInsert>(
    expense ?? {
      id: newExpenseId(),
      expense_date: todayISO(),
      category: 'Other',
      payee: '',
      payee_email: null,
      supplier_id: null,
      entity: null,
      amount: 0,
      payment_method: 'Bank Transfer',
      reference: null,
      recurrence: 'None',
      status: 'Pending',
      paid_on: null,
      attachments: [],
      periods: [],
      notes: null,
    }
  );

  const isRecurring = form.recurrence !== 'None';
  const isEmployeeCategory = form.category && EMPLOYEE_CATEGORIES.includes(form.category);
  const valid = !!form.payee.trim() && form.amount >= 0 && !!form.expense_date;

  const setRecurringToggle = (on: boolean) => {
    setForm((f) => {
      if (on) {
        const nextRecurrence = (f.recurrence ?? 'None') !== 'None' ? f.recurrence! : 'Monthly';
        const periods = f.periods?.length ? f.periods : [{
          period: f.expense_date.slice(0, 7),
          status: 'Pending' as ExpenseStatus,
          paid_on: null,
          attachments: [],
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
      if (status === 'Paid' && !f.paid_on) patch.paid_on = todayISO();
      if (status !== 'Paid') patch.paid_on = null;
      return { ...f, ...patch };
    });
  };

  const periods = form.periods ?? [];

  return (
    <Modal
      title={isNew ? 'New Expense' : form.id}
      subtitle={!isNew ? `${form.category} · ${form.payee}` : undefined}
      onClose={onClose}
    >
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
            onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as typeof f.category }))}
            style={inputStyle}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Payee</label>
          <input
            value={form.payee}
            onChange={(e) => setForm((f) => ({ ...f, payee: e.target.value }))}
            style={inputStyle}
            placeholder="e.g. Aisha Kamal, Office Petty Cash"
          />
        </div>
        <div>
          <label style={labelStyle}>Entity</label>
          <input
            value={form.entity ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value || null }))}
            style={inputStyle}
            placeholder="e.g. Google, YouTube, Bookstore A"
          />
        </div>

        {isEmployeeCategory && (
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Payee Email</label>
            <input
              type="email"
              value={form.payee_email ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, payee_email: e.target.value || null }))}
              style={inputStyle}
              placeholder="employee@voltara.com.my"
            />
          </div>
        )}

        <div>
          <label style={labelStyle}>{isRecurring ? 'Amount per period (RM)' : 'Amount (RM)'}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Payment Method</label>
          <select
            value={form.payment_method ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, payment_method: (e.target.value || null) as typeof f.payment_method }))}
            style={inputStyle}
          >
            <option value="">— Select —</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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
          onClick={() => onSave(form)}
          disabled={!valid}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !valid ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: !valid ? 'not-allowed' : 'pointer',
          }}
        >
          {isNew ? 'Create Expense' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

function PeriodEditor({
  period,
  onChange,
  onRemove,
  storagePath,
}: {
  period: ExpensePeriod;
  onChange: (patch: Partial<ExpensePeriod>) => void;
  onRemove: () => void;
  storagePath: string;
}) {
  const [periodInput, setPeriodInput] = useState(period.period);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const hasData = period.status !== 'Pending' || !!period.paid_on || (period.attachments?.length ?? 0) > 0;

  const handleStatus = (status: ExpenseStatus) => {
    const patch: Partial<ExpensePeriod> = { status };
    if (status === 'Paid' && !period.paid_on) patch.paid_on = todayISO();
    if (status !== 'Paid') patch.paid_on = null;
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

      <div>
        <label style={{ ...labelStyle, fontSize: 10 }}>Invoice / Receipt for {formatPeriodLabel(period.period)}</label>
        <AttachmentsField
          value={period.attachments ?? []}
          onChange={(next) => onChange({ attachments: next })}
          storagePath={storagePath}
        />
      </div>
    </div>
  );
}
