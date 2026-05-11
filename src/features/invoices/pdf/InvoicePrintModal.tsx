import { useEffect, useMemo } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { C } from '@/shared/tokens';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useDesign } from '@/features/form-designs';
import { pdfFilename } from '@/shared/lib/format';
import { InvoicePdf } from './InvoicePdf';
import type { Invoice } from '../types';

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoicePrintModal({ invoice, onClose }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { profile, design, isLoading } = useDesign('invoice');

  const customer = customers.find((c) => c.id === invoice.customer_id) ?? null;

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = !isLoading && profile && design;

  const docElement = useMemo(() => {
    if (!ready) return null;
    return (
      <InvoicePdf
        invoice={invoice}
        customer={customer}
        products={products}
        profile={profile}
        design={design}
      />
    );
  }, [ready, invoice, customer, products, profile, design]);

  const filename = pdfFilename(invoice.id, customer?.name);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Action bar */}
      <div
        style={{
          background: C.green, padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
          Invoice — {invoice.id}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {ready && docElement && (
            <PDFDownloadLink
              document={docElement}
              fileName={filename}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: C.yellow, color: C.green,
                fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                textDecoration: 'none', display: 'inline-block',
              }}
            >
              {({ loading }) => (loading ? 'Preparing PDF…' : '↓ Download PDF')}
            </PDFDownloadLink>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
              color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* PDF preview */}
      <div style={{ flex: 1, background: '#525659', overflow: 'hidden' }}>
        {!ready || !docElement ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontSize: 14 }}>
            Loading document design…
          </div>
        ) : (
          <PDFViewer
            width="100%"
            height="100%"
            showToolbar
            style={{ border: 'none' }}
          >
            {docElement}
          </PDFViewer>
        )}
      </div>
    </div>
  );
}
