import { useEffect, useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useSalesManagers } from '@/features/sales-managers';
import { useDesign } from '@/features/form-designs';
import { formatRM } from '@/shared/lib/format';
import { calcQuoteTotal } from '../types';
import type { Quote } from '../types';
import { sendQuoteViaWhatsApp } from './api';

interface Props {
  quote: Quote;
  onClose: () => void;
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
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function WhatsAppSendModal({ quote, onClose }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: managers = [] } = useSalesManagers();
  const { profile, design, isLoading } = useDesign('quote');

  const customer = customers.find((c) => c.id === quote.customer_id) ?? null;
  const salesManager = quote.sales_manager_id
    ? managers.find((m) => m.id === quote.sales_manager_id) ?? null
    : null;

  const defaultCaption = useMemo(() => {
    const total = formatRM(calcQuoteTotal(quote.line_items, quote.discount));
    return [
      `Hi ${customer?.name ?? 'there'},`,
      ``,
      `Please find attached our ${quote.type.toLowerCase()} ${quote.id}.`,
      `Total: ${total}.`,
      `Valid until: ${fmtDate(quote.valid_to)}.`,
      ``,
      `Let us know if you have any questions.`,
    ].join('\n');
  }, [quote, customer]);

  const [caption, setCaption] = useState(defaultCaption);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Close on Escape (only if not in the middle of a send)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isSending]);

  const ready = !isLoading && !!profile && !!design && !!customer && !!customer.phone;

  const handleSend = async () => {
    if (!ready || !customer || !profile || !design) return;
    setError(null);
    setIsSending(true);
    try {
      await sendQuoteViaWhatsApp({
        quote,
        customer,
        products,
        salesManager,
        profile,
        design,
        caption,
      });
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message ?? 'Send failed.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal title="Send via WhatsApp" subtitle={quote.id} onClose={onClose}>
      {/* Recipient summary */}
      <div style={{ background: C.seasalt, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{customer?.name ?? quote.customer_id}</div>
        <div style={{ fontSize: 12, color: C.slate }}>
          {customer?.phone ?? <span style={{ color: '#C0321A', fontWeight: 600 }}>No phone on file</span>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Message</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={9}
          disabled={isSending || success}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
        <div style={{ marginTop: 6, fontSize: 11, color: C.slate }}>
          The quotation PDF will be attached automatically.
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '10px 12px', background: '#FDEAEA', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ fontSize: 12, color: C.green, fontWeight: 600, padding: '10px 12px', background: C.honeydew, borderRadius: 8 }}>
          Sent. The customer will receive the quotation in WhatsApp shortly.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onClose}
          disabled={isSending}
          style={{
            marginLeft: 'auto',
            padding: '10px 20px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.slate,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 600,
            cursor: isSending ? 'not-allowed' : 'pointer',
            opacity: isSending ? 0.5 : 1,
          }}
        >
          {success ? 'Close' : 'Cancel'}
        </button>
        {!success && (
          <button
            onClick={handleSend}
            disabled={!ready || isSending || !caption.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: !ready || !caption.trim() ? C.slate : C.green,
              color: C.white,
              fontFamily: 'Figtree',
              fontSize: 13,
              fontWeight: 700,
              cursor: !ready || isSending || !caption.trim() ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.7 : 1,
            }}
          >
            {isSending ? 'Sending…' : 'Send WhatsApp'}
          </button>
        )}
      </div>
    </Modal>
  );
}
