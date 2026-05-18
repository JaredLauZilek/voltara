import type { Database } from '@/shared/lib/database.types';

export type SalesOrder = Database['public']['Tables']['sales_orders']['Row'];
export type SalesOrderInsert = Database['public']['Tables']['sales_orders']['Insert'];
export type SalesOrderUpdate = Database['public']['Tables']['sales_orders']['Update'];

export const SO_STATUSES = ['Open', 'Confirmed', 'Fulfilled', 'Cancelled'] as const;
export type SOStatus = (typeof SO_STATUSES)[number];

export function calcSOTotal(items: { qty: number; unit_price_snapshot: number }[], discount: number): number {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price_snapshot, 0);
  return subtotal * (1 - discount / 100);
}
