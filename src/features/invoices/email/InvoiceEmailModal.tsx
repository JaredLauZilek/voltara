import { createElement, useMemo } from 'react';
import { EmailSendModal } from '@/features/email-designs';
import { useCompanyProfile, useDesign } from '@/features/form-designs';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { formatRM, pdfFilename } from '@/shared/lib/format';
import { InvoicePdf } from '../pdf/InvoicePdf';
import { calcInvoiceTotals } from '../totals';
import { useInvoicePayments } from '../payments/hooks';
import type { Invoice } from '../types';
import type { PlaceholderContext } from '@/features/email-designs';

interface Props {
  invoice: Invoice;
  onClose: () => void;
  /** 'receipt' uses the receipt PDF variant and the 'receipt' email design. */
  variant?: 'invoice' | 'receipt';
}

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9._-]/g, '_');

export function InvoiceEmailModal({ invoice, onClose, variant = 'invoice' }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: payments = [] } = useInvoicePayments(invoice.id);
  const companyProfileQ = useCompanyProfile();
  // Receipts reuse the invoice's form-design (heading swap is in the renderer).
  const formDesign = useDesign('invoice');
  const isReceipt = variant === 'receipt';

  const customer = customers.find((c) => c.id === invoice.customer_id) ?? null;

  const ctx = useMemo<PlaceholderContext>(() => {
    const company = companyProfileQ.data;
    const total = calcInvoiceTotals(invoice.line_items, invoice.discount, invoice.tax, invoice.discount_mode).total;
    const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Math.max(0, total - paid);

    let payment_summary: PlaceholderContext['doc']['payment_summary'];
    if (payments.length === 0 && invoice.deposit_percent != null) {
      const depositAmt = +(total * Number(invoice.deposit_percent) / 100).toFixed(2);
      payment_summary = {
        kind: 'deposit',
        deposit_percent: Number(invoice.deposit_percent),
        deposit_amount: formatRM(depositAmt, 2),
      };
    } else if (payments.length > 0 && outstanding > 0.005) {
      payment_summary = { kind: 'partial', paid: formatRM(paid, 2), outstanding: formatRM(outstanding, 2) };
    } else if (payments.length > 0) {
      payment_summary = { kind: 'paid', paid: formatRM(paid, 2) };
    }

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
        kind:      isReceipt ? 'Receipt' : 'Invoice',
        date:      fmtDate(invoice.issue_date),
        due_date:  fmtDate(invoice.due_date),
        valid_to:  '—',
        total:     formatRM(total, 2),
        currency:  'RM',
        payment_summary,
      },
      company: {
        name:    company?.company_name ?? 'Voltara Sdn Bhd',
        address: company?.address ?? '',
        phone:   company?.phone ?? '',
        email:   company?.email ?? '',
        website: company?.website ?? '',
      },
    };
  }, [invoice, customer, payments, companyProfileQ.data, isReceipt]);

  if (!companyProfileQ.data || !formDesign.design) return null;

  const pdfDocument = createElement(InvoicePdf, {
    invoice,
    customer,
    products,
    profile: companyProfileQ.data,
    design: formDesign.design,
    payments,
    variant,
  });

  return (
    <EmailSendModal
      docType={isReceipt ? 'receipt' : 'invoice'}
      recipient={{
        name:  customer?.name ?? invoice.customer_id,
        email: customer?.email ?? null,
      }}
      subtitle={invoice.id}
      context={ctx}
      pdfDocument={pdfDocument}
      pdfFileName={pdfFilename(`${isReceipt ? 'RECEIPT-' : ''}${invoice.id}`, customer?.name)}
      storagePathPrefix={`invoices/${safeId(invoice.id)}/${isReceipt ? 'receipt-' : 'email-'}`}
      onClose={onClose}
    />
  );
}
