import { useState } from 'react';
import { C } from '@/shared/tokens';
import { formatRM, todayISO } from '@/shared/lib/format';
import { calcInvoiceTotals } from '../totals';
import type { Invoice } from '../types';
import { useInvoicePayments, useCreatePayment, useDeletePayment } from './hooks';
import { PAYMENT_METHODS, type PaymentMethod } from './types';
import { InvoicePrintModal } from '../pdf/InvoicePrintModal';
import { InvoiceEmailModal } from '../email';

interface Props {
  invoice: Invoice;
  depositPercent: number | null;
  onDepositPercentChange: (value: number | null) => void;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
  background: C.white,
};

export function PaymentsSection({ invoice, depositPercent, onDepositPercentChange }: Props) {
  const { data: payments = [], isLoading } = useInvoicePayments(invoice.id);
  const createMut = useCreatePayment();
  const deleteMut = useDeletePayment(invoice.id);

  const total = calcInvoiceTotals(invoice.line_items, invoice.discount, invoice.tax, invoice.discount_mode).total;
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(0, total - paid);
  const depositAmount = depositPercent !== null ? +(total * depositPercent / 100).toFixed(2) : 0;
  const showDepositRow = payments.length === 0;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    amount: outstanding > 0 ? outstanding : 0,
    paid_on: todayISO(),
    method: 'Bank Transfer' as PaymentMethod,
    label: '',
    reference: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [shareReceipt, setShareReceipt] = useState(false);

  const isFullyPaid = total > 0 && payments.length > 0 && outstanding < 0.005;
  const wouldOverpay = form.amount > 0 && paid + form.amount > total + 0.005;
  const canSubmit = form.amount > 0 && !!form.paid_on && !wouldOverpay && !createMut.isPending;

  const handleSubmit = () => {
    setError(null);
    if (wouldOverpay) {
      setError(`Payment exceeds outstanding balance of ${formatRM(outstanding, 2)}.`);
      return;
    }
    createMut.mutate(
      {
        invoice_id: invoice.id,
        amount: form.amount,
        paid_on: form.paid_on,
        method: form.method,
        label: form.label.trim() || null,
        reference: form.reference.trim() || null,
        notes: null,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setForm({
            amount: 0,
            paid_on: todayISO(),
            method: 'Bank Transfer',
            label: '',
            reference: '',
          });
        },
        onError: (e) => setError((e as Error).message),
      },
    );
  };

  return (
    <div style={{ background: C.seasalt, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Payments</span>
          {isFullyPaid && (
            <>
              <button
                onClick={() => setShowReceipt(true)}
                title="Print an Official Receipt — same layout as the invoice"
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `1px solid ${C.green}`,
                  background: C.white,
                  color: C.green,
                  fontFamily: 'Figtree',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ↓ Print Receipt
              </button>
              <button
                onClick={() => setShareReceipt(true)}
                title="Email the receipt to the customer"
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  color: C.green,
                  fontFamily: 'Figtree',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ↗ Share
              </button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          <span>
            <span style={{ color: C.slate, marginRight: 6 }}>Total</span>
            <strong style={{ color: C.ink }}>{formatRM(total, 2)}</strong>
          </span>
          <span>
            <span style={{ color: C.slate, marginRight: 6 }}>Paid</span>
            <strong style={{ color: C.green }}>{formatRM(paid, 2)}</strong>
          </span>
          <span>
            <span style={{ color: C.slate, marginRight: 6 }}>Outstanding</span>
            <strong style={{ color: outstanding > 0 ? C.error : C.green }}>{formatRM(outstanding, 2)}</strong>
          </span>
        </div>
      </div>
      {showReceipt && (
        <InvoicePrintModal invoice={invoice} variant="receipt" onClose={() => setShowReceipt(false)} />
      )}
      {shareReceipt && (
        <InvoiceEmailModal invoice={invoice} variant="receipt" onClose={() => setShareReceipt(false)} />
      )}

      {/* Deposit request (only when no payments yet) */}
      {showDepositRow && (
        <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Deposit
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={depositPercent ?? ''}
            placeholder="—"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return onDepositPercentChange(null);
              const n = parseFloat(v);
              if (Number.isFinite(n)) onDepositPercentChange(Math.min(100, Math.max(0, n)));
            }}
            style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }}
          />
          <span style={{ fontSize: 12, color: C.slate }}>% of total</span>
          {depositPercent !== null && (
            <>
              <span style={{ fontSize: 12, color: C.slate, marginLeft: 'auto' }}>Customer pays first</span>
              <strong style={{ fontSize: 13, color: C.green }}>{formatRM(depositAmount, 2)}</strong>
              <button
                onClick={() => onDepositPercentChange(null)}
                title="Clear deposit"
                style={{ border: 'none', background: 'transparent', color: C.slate, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 2 }}
              >
                Clear
              </button>
            </>
          )}
          {depositPercent === null && (
            <span style={{ fontSize: 11, color: C.slate, marginLeft: 'auto' }}>
              Optional — prints on the PDF as the deposit amount due before any payment is collected.
            </span>
          )}
        </div>
      )}

      {/* Payment list */}
      {isLoading ? (
        <div style={{ fontSize: 12, color: C.slate }}>Loading payments…</div>
      ) : payments.length === 0 ? (
        <div style={{ fontSize: 12, color: C.slate, padding: '6px 0' }}>No payments yet.</div>
      ) : (
        <div style={{ background: C.white, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Date', 'Label', 'Method', 'Reference', 'Amount', ''].map((h) => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.divider}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? `1px solid ${C.divider}` : 'none' }}>
                  <td style={{ padding: '7px 10px', color: C.slate }}>{p.paid_on}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 600 }}>{p.label ?? '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.slate }}>{p.method ?? '—'}</td>
                  <td style={{ padding: '7px 10px', color: C.slate, fontSize: 11 }}>{p.reference ?? ''}</td>
                  <td style={{ padding: '7px 10px', fontWeight: 700, color: C.green }}>{formatRM(Number(p.amount), 2)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right' }}>
                    {confirmDeleteId === p.id ? (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <button
                          onClick={() => { deleteMut.mutate(p.id); setConfirmDeleteId(null); }}
                          style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: C.error, color: C.white, fontFamily: 'Figtree', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        title="Delete payment"
                        style={{ border: 'none', background: 'transparent', color: C.slate, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 2 }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form / button */}
      {showForm ? (
        <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                style={{ ...inputStyle, borderColor: wouldOverpay ? C.error : C.border }}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Paid On</label>
              <input
                type="date"
                value={form.paid_on}
                onChange={(e) => setForm((f) => ({ ...f, paid_on: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Method</label>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
                style={inputStyle}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={labelStyle}>Label (optional)</label>
              <input
                type="text"
                value={form.label}
                placeholder="Deposit, Progress, Final…"
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Reference (optional)</label>
              <input
                type="text"
                value={form.reference}
                placeholder="Bank ref / cheque no"
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>
          {wouldOverpay && (
            <div style={{ fontSize: 11, color: C.error, fontWeight: 600 }}>
              Exceeds outstanding balance of {formatRM(outstanding, 2)}.
            </div>
          )}
          {error && (
            <div style={{ fontSize: 12, color: C.error, fontWeight: 600, padding: '8px 10px', background: C.errorBg, borderRadius: 6 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              disabled={createMut.isPending}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                padding: '7px 18px',
                borderRadius: 8,
                border: 'none',
                background: canSubmit ? C.green : C.slate,
                color: C.white,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
              }}
            >
              {createMut.isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      ) : (
        outstanding > 0 && (
          <button
            onClick={() => {
              setShowForm(true);
              setForm((f) => ({ ...f, amount: outstanding }));
            }}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: C.honeydew,
              color: C.green,
              fontFamily: 'Figtree',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Record Payment
          </button>
        )
      )}
    </div>
  );
}
