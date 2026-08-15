// Public API for the purchase-orders feature.
// Other features must import only from this barrel — never reach into internals.
export { PurchaseOrdersScreen } from './PurchaseOrdersScreen';
export { usePurchaseOrders } from './hooks';
export { calcPOTotal } from './types';
export type { PurchaseOrder } from './types';

// PDF document — see the note in features/invoices/index.ts. exports/ renders
// the same PO document into the monthly zip.
export { POPdf } from './pdf/POPdf';
