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
];

export const FONT_FAMILIES: CompanyProfile['font_family'][] = ['Figtree', 'Helvetica', 'Times', 'Courier'];
export const PAPER_SIZES: CompanyProfile['paper_size'][] = ['A4', 'Letter'];

export const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  sku: 'SKU',
  description: 'Description',
  qty: 'Qty',
  unit_price: 'Unit Price',
  tax: 'Tax',
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
