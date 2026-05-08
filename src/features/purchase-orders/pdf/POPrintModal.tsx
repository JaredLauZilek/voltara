import { useEffect, useMemo } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { C } from '@/shared/tokens';
import { useSuppliers } from '@/features/suppliers';
import { useProducts } from '@/features/products';
import { useDesign } from '@/features/form-designs';
import { POPdf } from './POPdf';
import type { PurchaseOrder } from '../types';

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
}

export function POPrintModal({ po, onClose }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();
  const { profile, design, isLoading } = useDesign('purchase_order');

  const supplier = suppliers.find((s) => s.id === po.supplier_id) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ready = !isLoading && profile && design;

  const docElement = useMemo(() => {
    if (!ready) return null;
    return (
      <POPdf
        po={po}
        supplier={supplier}
        products={products}
        profile={profile}
        design={design}
      />
    );
  }, [ready, po, supplier, products, profile, design]);

  const filename = `PO-${po.id}.pdf`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: C.green, padding: '14px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>
          Purchase Order — {po.id}
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
