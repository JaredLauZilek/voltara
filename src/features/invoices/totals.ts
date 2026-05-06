import type { LineItem } from '@/shared/types';

export interface Totals {
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
}

export function calcInvoiceTotals(items: LineItem[], discount: number, tax: number): Totals {
  const subtotal = items.reduce((s, it) => s + it.unit_price_snapshot * it.qty, 0);
  const discountAmt = subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = afterDiscount * (tax / 100);
  return { subtotal, discountAmt, taxAmt, total: afterDiscount + taxAmt };
}
