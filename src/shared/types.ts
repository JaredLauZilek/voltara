// Cross-feature value types (not row types — those live in each feature's types.ts).

// Generic file attachment stored in Supabase Storage ('attachments' bucket).
export interface Attachment {
  name: string;
  mime: string;
  storage_path: string;  // path inside the 'attachments' bucket
  size: number;
  uploaded_at: string;
}


// jsonb shape stored inside invoices.line_items, quotes.line_items, purchase_orders.line_items.
// unit_price_snapshot is taken at write time so historical totals stay stable when the
// products catalogue price changes later.
export interface LineItem {
  product_id: string;
  qty: number;
  unit_price_snapshot: number;
  description?: string; // editable per line item; pre-populated from service's default description
}
