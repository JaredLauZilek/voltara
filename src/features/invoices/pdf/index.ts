// PDF extension point — placeholder.
// See ./README.md for the contract. Replace this body with your renderer.

import type { Invoice } from '../types';

export interface RenderInvoicePdfOptions {
  paperSize?: 'A4' | 'Letter';
  locale?: 'en' | 'ms';
}

export async function renderInvoicePDF(
  invoice: Invoice,
  _opts?: RenderInvoicePdfOptions,
): Promise<Blob> {
  // Placeholder: produce a minimal text blob proving the wiring works.
  // Your renderer should replace this with real PDF output.
  const lines = [
    `VOLTARA INVOICE — ${invoice.id}`,
    `Customer ID: ${invoice.customer_id}`,
    `Issue: ${invoice.issue_date}    Due: ${invoice.due_date}`,
    `Status: ${invoice.status}`,
    '',
    'Line items:',
    ...invoice.line_items.map(
      (li) => `  ${li.qty} × ${li.product_id} @ RM ${li.unit_price_snapshot}`,
    ),
    '',
    `Discount: ${invoice.discount}%   Tax: ${invoice.tax}%`,
    '',
    '— Replace src/features/invoices/pdf/index.ts with your renderer —',
  ];
  return new Blob([lines.join('\n')], { type: 'text/plain' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
