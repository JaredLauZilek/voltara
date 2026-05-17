// Fetches historical MYR exchange rates from frankfurter.app (free, no API
// key, ECB-based, CORS-friendly, supports historical rates back to 1999).
//
// Use case: when an expense is saved in a foreign currency, we snapshot the
// rate for `expense_date` (or `paid_on` for periods) so KPI totals stay
// stable as live FX moves. Soft-fallback to the static MYR_RATES table when
// the network is down or the API returns an unexpected payload.

import { MYR_RATES } from './currency';

/** Returns the MYR rate for `currency` as of `date` (YYYY-MM-DD).
 *  RM → 1. Unknown / failed lookups fall back to MYR_RATES then 1. */
export async function fetchMyrRate(currency: string, date: string): Promise<number> {
  if (currency === 'RM') return 1;
  const fallback = MYR_RATES[currency] ?? 1;

  // Frankfurter caps historical lookups at the most recent ECB business day.
  // If the user picks today (which often has no rate yet at ~12pm MY time)
  // the API auto-falls back to the previous trading day.
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);

  try {
    const url = `https://api.frankfurter.app/${safeDate}?from=${encodeURIComponent(currency)}&to=MYR`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();
    const rate = data?.rates?.MYR;
    return typeof rate === 'number' && rate > 0 ? rate : fallback;
  } catch {
    return fallback;
  }
}

/** Converts using a snapshotted rate when present; otherwise falls back to
 *  the static MYR_RATES table (legacy / RM rows). */
export function toMYRSnapshot(
  amount: number,
  rate: number | null | undefined,
  currency: string | null | undefined,
): number {
  if (typeof rate === 'number' && rate > 0) return amount * rate;
  return amount * (MYR_RATES[currency ?? 'RM'] ?? 1);
}
