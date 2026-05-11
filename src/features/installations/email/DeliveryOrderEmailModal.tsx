import { createElement, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import { EmailSendModal } from '@/features/email-designs';
import { useCompanyProfile, useDesign } from '@/features/form-designs';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useQuotes, calcQuoteTotal } from '@/features/sales';
import { formatRM, pdfFilename } from '@/shared/lib/format';
import { DeliveryOrderPdf } from '../pdf/DeliveryOrderPdf';
import type { Installation } from '../types';
import type { PlaceholderContext } from '@/features/email-designs';

interface Props {
  installation: Installation;
  onClose: () => void;
}

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9._-]/g, '_');

export function DeliveryOrderEmailModal({ installation, onClose }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: quotes = [] } = useQuotes();
  const companyProfileQ = useCompanyProfile();
  const formDesign = useDesign('delivery_order');

  const customer = customers.find((c) => c.id === installation.customer_id) ?? null;
  const quote = installation.quote_id
    ? quotes.find((q) => q.id === installation.quote_id) ?? null
    : null;

  const ctx = useMemo<PlaceholderContext>(() => {
    const company = companyProfileQ.data;
    const total = quote ? calcQuoteTotal(quote.line_items, quote.discount) : 0;
    return {
      customer: {
        name:         customer?.name ?? '',
        email:        customer?.email ?? '',
        phone:        customer?.phone ?? '',
        address:      customer?.address ?? '',
        attention_to: customer?.attention_to ?? '',
      },
      doc: {
        id:        installation.id,
        kind:      'Delivery Order',
        date:      fmtDate(installation.scheduled),
        due_date:  '—',
        valid_to:  '—',
        total:     quote ? formatRM(total, 2) : '—',
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
  }, [installation, customer, quote, companyProfileQ.data]);

  const buildPdfBlob = async (): Promise<Blob> => {
    if (!companyProfileQ.data || !formDesign.design) {
      throw new Error('Form design is still loading.');
    }
    return await pdf(
      createElement(DeliveryOrderPdf, {
        installation,
        quote,
        customer,
        products,
        profile: companyProfileQ.data,
        design: formDesign.design,
      }),
    ).toBlob();
  };

  return (
    <EmailSendModal
      docType="delivery_order"
      recipient={{
        name:  customer?.name ?? installation.customer_id,
        email: customer?.email ?? null,
      }}
      subtitle={installation.id}
      context={ctx}
      buildPdfBlob={buildPdfBlob}
      pdfFileName={pdfFilename(installation.id, customer?.name)}
      storagePathPrefix={`installations/${safeId(installation.id)}/email-`}
      onClose={onClose}
    />
  );
}
