/** 1 = January, 12 = December. */
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Period {
  year: number;
  month: Month;
  /** Inclusive ISO date (YYYY-MM-DD) for the first day of the month. */
  startISO: string;
  /** Inclusive ISO date for the last day of the month. */
  endISO: string;
  /** "voltara-2026-04" — used as the zip filename prefix. */
  slug: string;
  /** "April 2026" — used in headings, README, etc. */
  label: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function makePeriod(year: number, month: Month): Period {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const mm = String(month).padStart(2, '0');
  return {
    year,
    month,
    startISO: fmt(start),
    endISO: fmt(end),
    slug: `voltara-${year}-${mm}`,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
  };
}

/** True when the given YYYY-MM-DD string falls inside [startISO, endISO]. */
export function inPeriod(iso: string | null | undefined, p: Period): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= p.startISO && d <= p.endISO;
}

export function currentMonth(): Period {
  const now = new Date();
  return makePeriod(now.getUTCFullYear(), (now.getUTCMonth() + 1) as Month);
}
