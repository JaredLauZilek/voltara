// Static conversion rates to Malaysian Ringgit (MYR / RM).
//
// These are NOT live rates — they're snapshot estimates used for aggregate
// reporting (KPI totals across multi-currency POs and Bills). Edit the numbers
// here when you want to refresh the conversion. Identity for RM.
//
// Last updated: 2026-05 — adjust as your treasury rates change.
export const MYR_RATES: Record<string, number> = {
  RM: 1,
  CNY: 0.62,
  SGD: 3.30,
  USD: 4.40,
};

/** Converts an amount in `currency` to MYR using the static rate table.
 *  Unknown currencies fall back to 1 (assume already-MYR). */
export function toMYR(amount: number, currency: string | null | undefined): number {
  const rate = MYR_RATES[currency ?? 'RM'] ?? 1;
  return amount * rate;
}
