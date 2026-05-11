import { createElement, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import { EmailSendModal } from '@/features/email-designs';
import { useCompanyProfile, useDesign } from '@/features/form-designs';
import { useSuppliers } from '@/features/suppliers';
import { useProducts } from '@/features/products';
import { POPdf } from '../pdf/POPdf';
import { calcPOTotal } from '../types';
import type { PurchaseOrder } from '../types';
import type { PlaceholderContext } from '@/features/email-designs';

interface Props {
  po: PurchaseOrder;
  onClose: () => void;
}

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9._-]/g, '_');

export function POEmailModal({ po, onClose }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();
  const companyProfileQ = useCompanyProfile();
  const formDesign = useDesign('purchase_order');

  const supplier = po.supplier_id ? suppliers.find((s) => s.id === po.supplier_id) ?? null : null;

  const ctx = useMemo<PlaceholderContext>(() => {
    const company = companyProfileQ.data;
    const total = calcPOTotal(po.line_items, po.discount);
    const fmtMoney = (n: number) =>
      `${po.currency} ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return {
      customer: {
        // PO recipients are suppliers, but the template keeps the "customer.*"
        // namespace for consistency — suppliers map into the same fields.
        name:         supplier?.name ?? '',
        email:        supplier?.email ?? '',
        phone:        supplier?.phone ?? '',
        address:      supplier?.address ?? '',
        attention_to: supplier?.contact ?? '',
      },
      doc: {
        id:        po.id,
        kind:      'Purchase Order',
        date:      fmtDate(po.created_date),
        due_date:  po.delivery_date ? fmtDate(po.delivery_date) : '—',
        valid_to:  '—',
        total:     fmtMoney(total),
        currency:  po.currency,
      },
      company: {
        name:    company?.company_name ?? 'Voltara Sdn Bhd',
        address: company?.address ?? '',
        phone:   company?.phone ?? '',
        email:   company?.email ?? '',
        website: company?.website ?? '',
      },
    };
  }, [po, supplier, companyProfileQ.data]);

  const buildPdfBlob = async (): Promise<Blob> => {
    if (!companyProfileQ.data || !formDesign.design) {
      throw new Error('Form design is still loading.');
    }
    return await pdf(
      createElement(POPdf, {
        po,
        supplier,
        products,
        profile: companyProfileQ.data,
        design: formDesign.design,
      }),
    ).toBlob();
  };

  return (
    <EmailSendModal
      docType="purchase_order"
      recipient={{
        name:  supplier?.name ?? po.supplier_id ?? po.id,
        email: supplier?.email ?? null,
      }}
      subtitle={po.id}
      context={ctx}
      buildPdfBlob={buildPdfBlob}
      pdfFileName={`PO-${po.id}.pdf`}
      storagePathPrefix={`purchase-orders/${safeId(po.id)}/email-`}
      onClose={onClose}
    />
  );
}
