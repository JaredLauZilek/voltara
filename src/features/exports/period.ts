export type Quarter = 1 | 2 | 3 | 4;

export interface Period {
  year: number;
  quarter: Quarter;
  /** Inclusive ISO date (YYYY-MM-DD) for the first day of the quarter. */
  startISO: string;
  /** Inclusive ISO date for the last day of the quarter. */
  endISO: string;
  /** "voltara-Q1-2026" — used as the zip filename prefix. */
  slug: string;
  label: string;
}

export function quarterOf(date: Date): Quarter {
  return (Math.floor(date.getMonth() / 3) + 1) as Quarter;
}

export function makePeriod(year: number, quarter: Quarter): Period {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    year,
    quarter,
    startISO: fmt(start),
    endISO: fmt(end),
    slug: `voltara-Q${quarter}-${year}`,
    label: `Q${quarter} ${year}`,
  };
}

/** True when the given YYYY-MM-DD string falls inside [startISO, endISO]. */
export function inPeriod(iso: string | null | undefined, p: Period): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= p.startISO && d <= p.endISO;
}

export function currentQuarter(): Period {
  const now = new Date();
  return makePeriod(now.getUTCFullYear(), quarterOf(now));
}
