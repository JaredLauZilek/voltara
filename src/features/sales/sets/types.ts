import type { Database } from '@/shared/lib/database.types';

export type QuoteSet = Database['public']['Tables']['quote_sets']['Row'];
export type QuoteSetInsert = Database['public']['Tables']['quote_sets']['Insert'];
export type QuoteSetUpdate = Database['public']['Tables']['quote_sets']['Update'];

/** Stored shape inside `quote_sets.line_items` — product reference + qty.
 *  Price is intentionally NOT stored: it's snapshotted at insertion time from
 *  the current product price, so existing sets stay current. */
export type QuoteSetItem = QuoteSet['line_items'][number];
