import type { Database } from '@/shared/lib/database.types';

export type Quote = Database['public']['Tables']['quotes']['Row'];
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert'];
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update'];

export const QUOTE_STATUSES = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired'] as const;
export const QUOTE_TYPES = ['Quotation', 'Proposal'] as const;

export function calcQuoteTotal(items: { qty: number; unit_price_snapshot: number }[], discount: number): number {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unit_price_snapshot, 0);
  return subtotal * (1 - discount / 100);
}
