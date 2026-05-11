// Interactive chart cards for the Overview screen.
//
// Each card owns its own hover state and renders a "readout" strip in the
// header that updates as the user hovers individual data points. The body of
// the chart is hand-rolled SVG so we can attach pointer handlers per segment.

import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Donut } from '@/shared/components/charts/Donut';
import { formatRM, formatRMShort, monthKey, monthLabel } from '@/shared/lib/format';
import { calcInvoiceTotals } from '@/features/invoices';
import { calcQuoteTotal } from '@/features/sales';
import type { Customer } from '@/features/customers';
import type { Invoice } from '@/features/invoices';
import type { Bill } from '@/features/bills';
import type { Quote } from '@/features/sales';
import type { Product } from '@/features/products';
import type { Expense } from '@/features/expenses';

// Re-export for OverviewScreen — keeps `from './charts'` ergonomic.
export { monthKey, monthLabel } from '@/shared/lib/format';

// ─── Shared helpers ─────────────────────────────────────────────────────────

export function lastNMonths(n: number): string[] {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return monthKey(d);
  });
}

// ─── Common card shell ──────────────────────────────────────────────────────

interface CardProps {
  title: string;
  readout?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
}

function Card({ title, readout, controls, children }: CardProps) {
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{title}</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 2, minHeight: 16 }}>{readout}</div>
        </div>
        {controls}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleGroup<T extends string>({ options, value, onChange }: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 2, padding: 2, background: C.seasalt, borderRadius: 8, flexShrink: 0 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: active ? C.white : 'transparent',
              color: active ? C.green : C.slate,
              fontFamily: 'Figtree',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── 1. Revenue (monthly, pre-tax post-discount) ────────────────────────────

interface RevenueProps {
  invoices: Invoice[];
}

export function RevenueCard({ invoices }: RevenueProps) {
  const [window, setWindow] = useState<'6' | '12' | '24'>('12');
  const months = lastNMonths(Number(window));

  const revArr = useMemo(() => {
    const rev = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === 'Cancelled') continue;
      const mk = monthKey(new Date(inv.issue_date));
      const total = calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode).total;
      rev.set(mk, (rev.get(mk) ?? 0) + total);
    }
    return months.map((m) => rev.get(m) ?? 0);
  }, [invoices, months]);

  const max = Math.max(1, ...revArr) * 1.1;
  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? months.length - 1;
  const hovRev = revArr[idx] ?? 0;
  const windowTotal = revArr.reduce((s, v) => s + v, 0);

  return (
    <Card
      title="Revenue"
      readout={
        <span>
          <strong style={{ color: C.green }}>{monthLabel(months[idx])}</strong> · {formatRMShort(hovRev)}
          <span style={{ marginLeft: 12, color: C.slate }}>· {formatRMShort(windowTotal)} over {window}m</span>
        </span>
      }
      controls={
        <ToggleGroup
          options={[{ label: '6m', value: '6' }, { label: '12m', value: '12' }, { label: '24m', value: '24' }]}
          value={window}
          onChange={setWindow}
        />
      }
    >
      <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${months.length * 36} 140`} width="100%" height={140} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <line key={i} x1="0" x2={months.length * 36} y1={140 - f * 110} y2={140 - f * 110} stroke={C.divider} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {months.map((_, i) => {
            const x = i * 36 + 8;
            const revH = (revArr[i] / max) * 110;
            const isHover = hover === i;
            return (
              <g key={i}>
                <rect x={x} y={140 - revH} width="20" height={revH} fill={C.green} opacity={isHover ? 1 : 0.85} rx="3" />
                <rect
                  x={x - 4}
                  y={0}
                  width={28}
                  height={140}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  style={{ cursor: 'crosshair' }}
                />
              </g>
            );
          })}
        </svg>
        <div style={{ display: 'flex', marginTop: 4 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: hover === i ? C.green : C.slate, fontWeight: hover === i ? 700 : 400 }}>
              {monthLabel(m)}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── 2. Quote Win Rate ──────────────────────────────────────────────────────

interface WinRateProps {
  quotes: Quote[];
}

export function QuoteWinRateCard({ quotes }: WinRateProps) {
  const [window, setWindow] = useState<'30' | '60' | '90'>('30');
  const months = lastNMonths(12);

  const points = useMemo(() => {
    const decided = quotes.filter((q) => ['Case Won', 'Case Lost', 'Expired'].includes(q.status));
    // For each month, compute win rate over the previous `window` days from the
    // month's anchor date.
    const days = Number(window);
    return months.map((mk) => {
      const [y, m] = mk.split('-').map(Number);
      const anchor = new Date(y, m, 0).getTime(); // end of month
      const cutoff = anchor - days * 86400000;
      const inWindow = decided.filter((q) => {
        const ts = new Date(q.won_at ?? q.valid_to).getTime();
        return ts >= cutoff && ts <= anchor;
      });
      const won = inWindow.filter((q) => q.status === 'Case Won').length;
      const total = inWindow.length;
      return { mk, rate: total === 0 ? null : (won / total) * 100, won, total };
    });
  }, [quotes, months, window]);

  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? months.length - 1;
  const point = points[idx];

  const W = months.length * 36;
  const validPts = points.map((p, i) => ({ i, rate: p.rate })).filter((p) => p.rate !== null);
  const poly = validPts
    .map(({ i, rate }) => {
      const x = i * 36 + 17;
      const y = 140 - ((rate as number) / 100) * 110;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Card
      title="Quote Win Rate"
      readout={
        <span>
          <strong style={{ color: C.green }}>{monthLabel(months[idx])}</strong> · {point?.rate === null ? 'no decisions' : `${point?.rate?.toFixed(0)}%`}
          {point?.total ? ` · ${point.won}/${point.total} decided` : ''}
        </span>
      }
      controls={
        <ToggleGroup
          options={[{ label: '30d', value: '30' }, { label: '60d', value: '60' }, { label: '90d', value: '90' }]}
          value={window}
          onChange={setWindow}
        />
      }
    >
      <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} 140`} width="100%" height={140} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <line key={i} x1="0" x2={W} y1={140 - f * 110} y2={140 - f * 110} stroke={C.divider} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {validPts.length > 1 && <polyline points={poly} fill="none" stroke={C.green} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />}
          {points.map((p, i) => {
            if (p.rate === null) return null;
            const x = i * 36 + 17;
            const y = 140 - (p.rate / 100) * 110;
            return <circle key={i} cx={x} cy={y} r={hover === i ? 5 : 3.5} fill="white" stroke={C.green} strokeWidth="2" vectorEffect="non-scaling-stroke" />;
          })}
          {months.map((_, i) => (
            <rect
              key={i}
              x={i * 36}
              y={0}
              width={36}
              height={140}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: 'crosshair' }}
            />
          ))}
        </svg>
        <div style={{ display: 'flex', marginTop: 4 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: hover === i ? C.green : C.slate, fontWeight: hover === i ? 700 : 400 }}>
              {monthLabel(m)}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── 3. Sales Pipeline Value (RM by quote status) ──────────────────────────

interface PipelineProps {
  quotes: Quote[];
}

export function SalesPipelineValueCard({ quotes }: PipelineProps) {
  const buckets = useMemo(() => {
    const map = new Map<Quote['status'], { count: number; value: number }>();
    for (const q of quotes) {
      const total = calcQuoteTotal(q.line_items, q.discount);
      const cur = map.get(q.status) ?? { count: 0, value: 0 };
      map.set(q.status, { count: cur.count + 1, value: cur.value + total });
    }
    return (['Draft', 'Sent', 'Case Won', 'Case Lost', 'Expired'] as Quote['status'][]).map((s) => ({
      status: s,
      ...(map.get(s) ?? { count: 0, value: 0 }),
    }));
  }, [quotes]);

  const max = Math.max(1, ...buckets.map((b) => b.value));
  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? buckets.findIndex((b) => b.status === 'Sent');
  const point = buckets[idx];

  const colors: Record<Quote['status'], string> = {
    Draft: C.slate, Sent: '#1A62C0', 'Case Won': C.green, 'Case Lost': '#C0321A', Expired: '#B45309',
  };

  return (
    <Card
      title="Sales Pipeline Value"
      readout={
        <span>
          <strong style={{ color: C.green }}>{point?.status}</strong> · {point?.count ?? 0} quote{point?.count === 1 ? '' : 's'} · {formatRM(point?.value ?? 0)}
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onMouseLeave={() => setHover(null)}>
        {buckets.map((b, i) => (
          <div
            key={b.status}
            onMouseEnter={() => setHover(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'crosshair', padding: '4px 0' }}
          >
            <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: C.slate, flexShrink: 0 }}>{b.status}</div>
            <div style={{ flex: 1, background: C.divider, borderRadius: 99, height: 14, overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${(b.value / max) * 100}%`,
                  height: '100%',
                  background: colors[b.status],
                  borderRadius: 99,
                  transition: 'width .4s',
                  opacity: hover === i ? 1 : 0.85,
                }}
              />
            </div>
            <div style={{ width: 90, fontSize: 12, fontWeight: 700, color: C.green, textAlign: 'right' }}>{formatRMShort(b.value)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 5. Conversion Funnel ───────────────────────────────────────────────────

interface FunnelProps {
  quotes: Quote[];
  invoices: Invoice[];
  installationsCompleted: number;
}

export function ConversionFunnelCard({ quotes, invoices, installationsCompleted }: FunnelProps) {
  const quotesTotal = quotes.length;
  const won = quotes.filter((q) => q.status === 'Case Won').length;
  const invoiced = invoices.length;
  const paid = invoices.filter((i) => i.status === 'Paid').length;

  const stages = [
    { label: 'Quotes', count: quotesTotal, color: C.opal },
    { label: 'Case Won', count: won, color: C.green },
    { label: 'Invoiced', count: invoiced, color: C.yellow },
    { label: 'Installed', count: installationsCompleted, color: '#1A62C0' },
    { label: 'Paid', count: paid, color: '#22a14b' },
  ];

  const max = Math.max(1, ...stages.map((s) => s.count));
  const [hover, setHover] = useState<number | null>(null);

  return (
    <Card
      title="Conversion Funnel"
      readout={
        hover !== null && hover > 0 && stages[hover - 1].count > 0 ? (
          <span>
            <strong style={{ color: C.green }}>{stages[hover].label}</strong> · {stages[hover].count} · {((stages[hover].count / stages[hover - 1].count) * 100).toFixed(0)}% of {stages[hover - 1].label}
          </span>
        ) : (
          <span>Quote → Won → Invoiced → Installed → Paid</span>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onMouseLeave={() => setHover(null)}>
        {stages.map((s, i) => (
          <div
            key={s.label}
            onMouseEnter={() => setHover(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'crosshair' }}
          >
            <div style={{ width: 80, fontSize: 11, fontWeight: 700, color: C.slate, flexShrink: 0 }}>{s.label}</div>
            <div style={{ flex: 1, height: 18, background: C.divider, borderRadius: 6, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(s.count / max) * 100}%`,
                  height: '100%',
                  background: s.color,
                  transition: 'width .4s',
                  opacity: hover === i ? 1 : 0.85,
                  borderRadius: 6,
                }}
              />
            </div>
            <div style={{ width: 40, fontSize: 13, fontWeight: 700, color: C.green, textAlign: 'right' }}>{s.count}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 6. Top Customers by Revenue ────────────────────────────────────────────

interface TopCustomersProps {
  customers: Customer[];
  invoices: Invoice[];
}

export function TopCustomersCard({ customers, invoices }: TopCustomersProps) {
  const rows = useMemo(() => {
    const totals = new Map<string, { value: number; count: number }>();
    for (const inv of invoices) {
      if (inv.status === 'Cancelled') continue;
      const total = calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode).total;
      const cur = totals.get(inv.customer_id) ?? { value: 0, count: 0 };
      totals.set(inv.customer_id, { value: cur.value + total, count: cur.count + 1 });
    }
    return [...totals.entries()]
      .map(([cid, t]) => ({ customerId: cid, name: customers.find((c) => c.id === cid)?.name ?? cid, value: t.value, count: t.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [customers, invoices]);

  const max = Math.max(1, ...rows.map((r) => r.value));
  const [hover, setHover] = useState<number | null>(null);
  const point = hover !== null ? rows[hover] : null;

  return (
    <Card
      title="Top Customers"
      readout={
        point ? (
          <span>
            <strong style={{ color: C.green }}>{point.name}</strong> · {formatRM(point.value)} across {point.count} invoice{point.count === 1 ? '' : 's'}
          </span>
        ) : (
          <span>By total invoiced (non-cancelled)</span>
        )
      }
    >
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.slate, padding: '12px 0' }}>No invoices yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onMouseLeave={() => setHover(null)}>
          {rows.map((r, i) => (
            <div
              key={r.customerId}
              onMouseEnter={() => setHover(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'crosshair' }}
            >
              <div style={{ width: 18, fontSize: 11, color: C.slate, textAlign: 'right' }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ width: 120, background: C.divider, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: C.green, borderRadius: 99, opacity: hover === i ? 1 : 0.85, transition: 'width .4s' }} />
              </div>
              <div style={{ width: 70, fontSize: 12, fontWeight: 700, color: C.green, textAlign: 'right' }}>{formatRMShort(r.value)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── 7. Customer Acquisition by Lead Source ────────────────────────────────

interface LeadSourceProps {
  customers: Customer[];
}

const LEAD_COLORS = ['#22a14b', C.opal, '#FECC3E', C.slate] as const;
const LEAD_LABELS: Record<string, string> = {
  'WhatsApp (Google)': 'WA · Google',
  'WhatsApp (Meta)': 'WA · Meta',
  'Website Enquiry': 'Website',
  'Unspecified': 'Unspecified',
};

export function LeadSourceCard({ customers }: LeadSourceProps) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of customers) {
      const key = c.lead_source ?? 'Unspecified';
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [customers]);

  const total = counts.reduce((s, [, v]) => s + v, 0);
  const [hover, setHover] = useState<number | null>(null);
  const seg = hover !== null ? counts[hover] : null;

  return (
    <Card
      title="Customer Acquisition"
      readout={
        seg ? (
          <span>
            <strong style={{ color: C.green }}>{seg[0]}</strong> · {seg[1]} customer{seg[1] === 1 ? '' : 's'} · {total === 0 ? 0 : ((seg[1] / total) * 100).toFixed(0)}%
          </span>
        ) : (
          <span>By lead source · {total} total</span>
        )
      }
    >
      {total === 0 ? (
        <div style={{ fontSize: 13, color: C.slate, padding: '12px 0' }}>No customers yet.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }} onMouseLeave={() => setHover(null)}>
          <Donut segments={counts.map(([, v], i) => ({ value: v, color: LEAD_COLORS[i] ?? C.slate }))} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {counts.map(([label, v], i) => (
              <div
                key={label}
                onMouseEnter={() => setHover(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'crosshair', padding: '2px 0' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: LEAD_COLORS[i] ?? C.slate, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: C.slate }}>{LEAD_LABELS[label] ?? label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: hover === i ? C.green : '#1a1a1a' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── 9. Cash Flow ───────────────────────────────────────────────────────────

interface CashFlowProps {
  invoices: Invoice[];
  bills: Bill[];
  expenses: Expense[];
}

export function CashFlowCard({ invoices, bills, expenses }: CashFlowProps) {
  const [window, setWindow] = useState<'6' | '12' | '24'>('12');
  const months = lastNMonths(Number(window));

  const { revArr, outArr, netArr } = useMemo(() => {
    const rev = new Map<string, number>();
    const out = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === 'Cancelled') continue;
      const mk = monthKey(new Date(inv.issue_date));
      rev.set(mk, (rev.get(mk) ?? 0) + calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode).total);
    }
    for (const b of bills) {
      if ((b.currency ?? 'RM') !== 'RM') continue;
      const mk = monthKey(new Date(b.bill_date));
      out.set(mk, (out.get(mk) ?? 0) + b.amount + b.tax);
    }
    for (const e of expenses) {
      if (e.status === 'Cancelled') continue;
      const mk = monthKey(new Date(e.expense_date));
      out.set(mk, (out.get(mk) ?? 0) + e.amount);
    }
    const r = months.map((m) => rev.get(m) ?? 0);
    const o = months.map((m) => out.get(m) ?? 0);
    return { revArr: r, outArr: o, netArr: r.map((v, i) => v - o[i]) };
  }, [invoices, bills, expenses, months]);

  const allValues = [...revArr, ...outArr, ...netArr.map((v) => Math.abs(v))];
  const max = Math.max(1, ...allValues) * 1.15;
  const zeroY = 140 - (Math.max(0, ...netArr.filter((v) => v < 0).map((v) => -v)) / max) * 110;

  const [hover, setHover] = useState<number | null>(null);
  const idx = hover ?? months.length - 1;

  const W = months.length * 36;

  const polyFor = (arr: number[]): string =>
    arr.map((v, i) => `${i * 36 + 17},${140 - (v / max) * 110}`).join(' ');

  return (
    <Card
      title="Cash Flow"
      readout={
        <span>
          <strong style={{ color: C.green }}>{monthLabel(months[idx])}</strong> · In {formatRMShort(revArr[idx])} · Out {formatRMShort(outArr[idx])} · Net{' '}
          <span style={{ color: netArr[idx] >= 0 ? C.green : '#C0321A', fontWeight: 700 }}>{formatRMShort(netArr[idx])}</span>
        </span>
      }
      controls={
        <ToggleGroup
          options={[{ label: '6m', value: '6' }, { label: '12m', value: '12' }, { label: '24m', value: '24' }]}
          value={window}
          onChange={setWindow}
        />
      }
    >
      <div style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} 140`} width="100%" height={140} preserveAspectRatio="none">
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <line key={i} x1="0" x2={W} y1={140 - f * 110} y2={140 - f * 110} stroke={C.divider} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke={C.slate} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke" />
          <polyline points={polyFor(revArr)} fill="none" stroke={C.green} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <polyline points={polyFor(outArr)} fill="none" stroke="#C0321A" strokeWidth="2.5" opacity="0.8" vectorEffect="non-scaling-stroke" />
          <polyline points={polyFor(netArr.map((v) => Math.max(v, 0)))} fill="none" stroke="#1A62C0" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          {months.map((_, i) => (
            <rect
              key={i}
              x={i * 36}
              y={0}
              width={36}
              height={140}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: 'crosshair' }}
            />
          ))}
        </svg>
        <div style={{ display: 'flex', marginTop: 4 }}>
          {months.map((m, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: hover === i ? C.green : C.slate, fontWeight: hover === i ? 700 : 400 }}>
              {monthLabel(m)}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: C.slate }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 2, background: C.green }} /> Revenue
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 2, background: '#C0321A' }} /> Bills + Expenses
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 2, background: '#1A62C0', borderTop: '1px dashed #1A62C0' }} /> Net
          </span>
        </div>
      </div>
    </Card>
  );
}

// ─── 10. Low Stock Alerts ───────────────────────────────────────────────────

interface LowStockProps {
  products: Product[];
}

export function LowStockCard({ products }: LowStockProps) {
  const rows = useMemo(() => {
    return products
      .filter((p) => !p.is_service && p.qty !== null && p.qty < p.reorder_level)
      .map((p) => ({
        id: p.id,
        name: p.name,
        qty: p.qty ?? 0,
        reorder_level: p.reorder_level,
        deficit: p.reorder_level - (p.qty ?? 0),
      }))
      .sort((a, b) => b.deficit - a.deficit)
      .slice(0, 8);
  }, [products]);

  const max = Math.max(1, ...rows.map((r) => r.reorder_level));
  const [hover, setHover] = useState<number | null>(null);
  const row = hover !== null ? rows[hover] : null;

  return (
    <Card
      title="Low Stock Alerts"
      readout={
        row ? (
          <span>
            <strong style={{ color: '#C0321A' }}>{row.name}</strong> · {row.qty} on hand · reorder at {row.reorder_level} · short by {row.deficit}
          </span>
        ) : (
          <span>Products below reorder level ({rows.length} item{rows.length === 1 ? '' : 's'})</span>
        )
      }
    >
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: C.slate, padding: '12px 0' }}>All products at or above reorder level.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} onMouseLeave={() => setHover(null)}>
          {rows.map((r, i) => (
            <div
              key={r.id}
              onMouseEnter={() => setHover(i)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'crosshair' }}
            >
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
              <div style={{ width: 120, background: C.divider, borderRadius: 99, height: 8, overflow: 'hidden', position: 'relative' }}>
                <div style={{ width: `${(r.qty / max) * 100}%`, height: '100%', background: r.qty === 0 ? '#C0321A' : '#B07D00', borderRadius: 99, opacity: hover === i ? 1 : 0.85, transition: 'width .4s' }} />
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    left: `${(r.reorder_level / max) * 100}%`,
                    width: 2,
                    height: 12,
                    background: C.slate,
                  }}
                  title={`Reorder at ${r.reorder_level}`}
                />
              </div>
              <div style={{ width: 70, fontSize: 12, fontWeight: 700, color: '#C0321A', textAlign: 'right' }}>
                {r.qty}/{r.reorder_level}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
