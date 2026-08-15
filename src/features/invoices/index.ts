// Public API for the invoices feature.
// Other features must import only from this barrel — never reach into internals.
export { InvoicesScreen } from './InvoicesScreen';
export { useInvoices } from './hooks';
export { calcInvoiceTotals } from './totals';
export type { Invoice } from './types';

// Payments. The exports feature builds the monthly zip from these, so they are
// part of the public surface rather than invoice-private.
export { useAllInvoicePayments } from './payments/hooks';
export type { InvoicePayment } from './payments/types';

// PDF document. Exposed so other features can compose the same rendered
// invoice (exports/ embeds it in the monthly zip) instead of duplicating the
// layout. @react-pdf/renderer is already reachable through InvoicesScreen, so
// this adds no bundle weight.
export { InvoicePdf } from './pdf/InvoicePdf';
