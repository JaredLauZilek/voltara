// Cross-feature value types (not row types — those live in each feature's types.ts).

// jsonb shape stored inside invoices.line_items, quotes.line_items, purchase_orders.line_items.
// unit_price_snapshot is taken at write time so historical totals stay stable when the
// products catalogue price changes later.
export interface LineItem {
  product_id: string;
  qty: number;
  unit_price_snapshot: number;
}
