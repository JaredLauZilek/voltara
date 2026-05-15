import type { Database } from '@/shared/lib/database.types';

export type CompanyProfile = Database['public']['Tables']['company_profile']['Row'];
export type CompanyProfileUpdate = Database['public']['Tables']['company_profile']['Update'];

export type FormDesign = Database['public']['Tables']['form_designs']['Row'];
export type FormDesignUpdate = Database['public']['Tables']['form_designs']['Update'];

export type DocType = FormDesign['doc_type'];
export type ColumnVisibility = FormDesign['column_visibility'];

export const DOC_TYPES: { id: DocType; label: string }[] = [
  { id: 'invoice',         label: 'Invoice' },
  { id: 'quote',           label: 'Quotation' },
  { id: 'delivery_order',  label: 'Delivery Order' },
  { id: 'purchase_order',  label: 'Purchase Order' },
  // Receipts reuse the invoice form-design (same layout, different heading
  // and footer rules — see InvoicePdf variant). The form-designs UI filters
  // this out of its tab list; the email-designs UI shows it as its own tab.
  { id: 'receipt',         label: 'Receipt' },
];

export const FONT_FAMILIES: CompanyProfile['font_family'][] = ['Figtree', 'Helvetica', 'Times', 'Courier'];
export const PAPER_SIZES: CompanyProfile['paper_size'][] = ['A4', 'Letter'];

// Tax column is intentionally excluded — invoices have a global tax toggle
// in InvoiceModal, and quotes/POs don't render tax at the line-item level.
export const COLUMN_LABELS: Partial<Record<keyof ColumnVisibility, string>> = {
  sku: 'SKU',
  description: 'Description',
  qty: 'Qty',
  unit_price: 'Unit Price',
  line_total: 'Line Total',
};

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  sku: true,
  description: true,
  qty: true,
  unit_price: true,
  tax: false,
  line_total: true,
};
