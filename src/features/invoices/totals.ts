import type { LineItem } from '@/shared/types';

export interface Totals {
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
}

/**
 * `discount` semantics depend on `discountMode`:
 *   - 'percent' (default): treated as % of subtotal
 *   - 'amount':            treated as a flat RM amount, capped at subtotal
 */
export function calcInvoiceTotals(
  items: LineItem[],
  discount: number,
  tax: number,
  discountMode: 'percent' | 'amount' = 'percent',
): Totals {
  const subtotal = items.reduce((s, it) => s + it.unit_price_snapshot * it.qty, 0);
  const discountAmt =
    discountMode === 'amount'
      ? Math.min(subtotal, Math.max(0, discount))
      : subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (tax / 100);
  return { subtotal, discountAmt, taxAmt, total: afterDiscount + taxAmt };
}
