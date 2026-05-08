import type { Database } from '@/shared/lib/database.types';

export type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];
export type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
export type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];

export const PO_STATUSES = ['Draft', 'Submitted', 'Approved', 'Received', 'Partial', 'Cancelled'] as const;
export const PO_DIRECTIONS = ['outgoing', 'incoming'] as const;
export const PO_CURRENCIES = ['RM', 'CNY', 'SGD', 'USD'] as const;
export type POCurrency = (typeof PO_CURRENCIES)[number];

export function calcPOTotal(items: { qty: number; unit_price_snapshot: number }[], discount: number): number {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price_snapshot, 0);
  return subtotal * (1 - discount / 100);
}
