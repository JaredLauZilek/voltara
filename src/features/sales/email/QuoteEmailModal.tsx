import { createElement, useMemo } from 'react';
import { pdf } from '@react-pdf/renderer';
import { EmailSendModal } from '@/features/email-designs';
import { useCompanyProfile, useDesign } from '@/features/form-designs';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useSalesManagers } from '@/features/sales-managers';
import { formatRM } from '@/shared/lib/format';
import { QuotePdf } from '../pdf/QuotePdf';
import { calcQuoteTotal } from '../types';
import type { Quote } from '../types';
import type { PlaceholderContext } from '@/features/email-designs';

interface Props {
  quote: Quote;
  onClose: () => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9._-]/g, '_');

export function QuoteEmailModal({ quote, onClose }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: managers = [] } = useSalesManagers();
  const companyProfileQ = useCompanyProfile();
  const formDesign = useDesign('quote');

  const customer = customers.find((c) => c.id === quote.customer_id) ?? null;
  const salesManager = quote.sales_manager_id
    ? managers.find((m) => m.id === quote.sales_manager_id) ?? null
    : null;

  const ctx = useMemo<PlaceholderContext>(() => {
    const company = companyProfileQ.data;
    return {
      customer: {
        name:         customer?.name ?? '',
        email:        customer?.email ?? '',
        phone:        customer?.phone ?? '',
        address:      customer?.address ?? '',
        attention_to: customer?.attention_to ?? '',
      },
      doc: {
        id:        quote.id,
        kind:      quote.type,
        date:      fmtDate(quote.valid_from),
        due_date:  '—',
        valid_to:  fmtDate(quote.valid_to),
        total:     formatRM(calcQuoteTotal(quote.line_items, quote.discount)),
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
  }, [quote, customer, companyProfileQ.data]);

  const buildPdfBlob = async (): Promise<Blob> => {
    if (!companyProfileQ.data || !formDesign.design) {
      throw new Error('Form design is still loading.');
    }
    return await pdf(
      createElement(QuotePdf, {
        quote,
        customer,
        products,
        salesManager,
        profile: companyProfileQ.data,
        design: formDesign.design,
      }),
    ).toBlob();
  };

  return (
    <EmailSendModal
      docType="quote"
      recipient={{
        name:  customer?.name ?? quote.customer_id,
        email: customer?.email ?? null,
      }}
      subtitle={quote.id}
      context={ctx}
      buildPdfBlob={buildPdfBlob}
      pdfFileName={`${quote.type}-${quote.id}.pdf`}
      storagePathPrefix={`quotes/${safeId(quote.id)}/email-`}
      onClose={onClose}
    />
  );
}
