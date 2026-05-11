import { createElement, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import { EmailSendModal } from '@/features/email-designs';
import { useCompanyProfile, useDesign } from '@/features/form-designs';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { formatRM, pdfFilename } from '@/shared/lib/format';
import { InvoicePdf } from '../pdf/InvoicePdf';
import { calcInvoiceTotals } from '../totals';
import type { Invoice } from '../types';
import type { PlaceholderContext } from '@/features/email-designs';

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9._-]/g, '_');

export function InvoiceEmailModal({ invoice, onClose }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const companyProfileQ = useCompanyProfile();
  const formDesign = useDesign('invoice');

  const customer = customers.find((c) => c.id === invoice.customer_id) ?? null;

  const ctx = useMemo<PlaceholderContext>(() => {
    const company = companyProfileQ.data;
    const total = calcInvoiceTotals(invoice.line_items, invoice.discount, invoice.tax).total;
    return {
      customer: {
        name:         customer?.name ?? '',
        email:        customer?.email ?? '',
        phone:        customer?.phone ?? '',
        address:      customer?.address ?? '',
        attention_to: customer?.attention_to ?? '',
      },
      doc: {
        id:        invoice.id,
        kind:      'Invoice',
        date:      fmtDate(invoice.issue_date),
        due_date:  fmtDate(invoice.due_date),
        valid_to:  '—',
        total:     formatRM(total),
        currency:  'RM',
      },
      company: {
        name:    company?.company_name ?? 'Voltara Sdn Bhd',
        address: company?.address ?? '',
        phone:   company?.phone ?? '',
        email:   company?.email ?? '',
        website: company?.website ?? '',
      },
    };
  }, [invoice, customer, companyProfileQ.data]);

  const buildPdfBlob = async (): Promise<Blob> => {
    if (!companyProfileQ.data || !formDesign.design) {
      throw new Error('Form design is still loading.');
    }
    return await pdf(
      createElement(InvoicePdf, {
        invoice,
        customer,
        products,
        profile: companyProfileQ.data,
        design: formDesign.design,
      }),
    ).toBlob();
  };

  return (
    <EmailSendModal
      docType="invoice"
      recipient={{
        name:  customer?.name ?? invoice.customer_id,
        email: customer?.email ?? null,
      }}
      subtitle={invoice.id}
      context={ctx}
      buildPdfBlob={buildPdfBlob}
      pdfFileName={pdfFilename(invoice.id, customer?.name)}
      storagePathPrefix={`invoices/${safeId(invoice.id)}/email-`}
      onClose={onClose}
    />
  );
}
