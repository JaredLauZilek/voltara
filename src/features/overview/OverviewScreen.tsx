import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Sparkline } from '@/shared/components/charts/Sparkline';
import { MiniBar } from '@/shared/components/charts/MiniBar';
import { formatRMShort } from '@/shared/lib/format';
import { useCustomers } from '@/features/customers';
import { useInvoices, calcInvoiceTotals } from '@/features/invoices';
import { useBills } from '@/features/bills';
import { useQuotes } from '@/features/sales';
import { useProducts } from '@/features/products';
import { useExpenses } from '@/features/expenses';
import { useInstallations } from '@/features/installations';
import {
  monthKey,
  monthLabel,
  lastNMonths,
  RevenueCard,
  QuoteWinRateCard,
  SalesPipelineValueCard,
  ConversionFunnelCard,
  TopCustomersCard,
  LeadSourceCard,
  CashFlowCard,
  LowStockCard,
} from './charts';

const monthFullLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

function trendPct(curr: number, prev: number): string | undefined {
  if (prev === 0) return curr === 0 ? undefined : '—';
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return `${Math.abs(pct).toFixed(1)}%`;
}

export function OverviewScreen() {
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [] } = useInvoices();
  const { data: bills = [] } = useBills();
  const { data: quotes = [] } = useQuotes();
  const { data: products = [] } = useProducts();
  const { data: expenses = [] } = useExpenses();
  const { data: installations = [] } = useInstallations();

  const installationsCompleted = installations.filter((i) => i.status === 'Completed').length;

  const months = useMemo(() => lastNMonths(12), []);
  const [selectedIdx, setSelectedIdx] = useState<number>(months.length - 1);
  const selectedMonth = months[selectedIdx];
  const previousMonth = selectedIdx > 0 ? months[selectedIdx - 1] : null;
  const isCurrent = selectedIdx === months.length - 1;

  const { kpis, sparklines } = useMemo(() => {
    const productById = new Map(products.map((p) => [p.id, p]));

    // Per-invoice gross profit. COGS comes from the product/service landed
    // cost (products.cost) snapshotted at qty × cost per line item. Bills are
    // a cash-flow concept and are NOT used here.
    const invoiceProfit = (inv: typeof invoices[number]): number => {
      const totals = calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode);
      const revenue = totals.subtotal - totals.discountAmt; // pre-tax
      let cogs = 0;
      for (const li of inv.line_items) {
        if (!li.product_id) continue; // custom row: no known cost
        const product = productById.get(li.product_id);
        if (!product) continue;
        cogs += li.qty * Number(product.cost ?? 0);
      }
      return revenue - cogs;
    };

    const revByMonth = new Map<string, number>();
    const profitByMonth = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === 'Cancelled') continue;
      const mk = monthKey(new Date(inv.issue_date));
      revByMonth.set(mk, (revByMonth.get(mk) ?? 0) + calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode).total);
      profitByMonth.set(mk, (profitByMonth.get(mk) ?? 0) + invoiceProfit(inv));
    }
    const wonByMonth = new Map<string, number>();
    for (const q of quotes) {
      if (q.status !== 'Case Won' || !q.won_at) continue;
      const mk = monthKey(new Date(q.won_at));
      wonByMonth.set(mk, (wonByMonth.get(mk) ?? 0) + 1);
    }

    const revArr = months.map((m) => revByMonth.get(m) ?? 0);
    const profitArr = months.map((m) => profitByMonth.get(m) ?? 0);
    const ordersArr = months.map((m) => wonByMonth.get(m) ?? 0);

    return {
      kpis: {
        revenue: { curr: revByMonth.get(selectedMonth) ?? 0, prev: previousMonth ? (revByMonth.get(previousMonth) ?? 0) : 0 },
        profit: { curr: profitByMonth.get(selectedMonth) ?? 0, prev: previousMonth ? (profitByMonth.get(previousMonth) ?? 0) : 0 },
        orders: { curr: wonByMonth.get(selectedMonth) ?? 0, prev: previousMonth ? (wonByMonth.get(previousMonth) ?? 0) : 0 },
        activeCustomers: customers.filter((c) => c.status === 'Active').length,
      },
      sparklines: { revArr, profitArr, ordersArr },
    };
  }, [invoices, quotes, customers, products, months, selectedMonth, previousMonth]);

  // Sparkline window: 8 months ending at the selected month
  const sparkEnd = selectedIdx + 1;
  const sparkStart = Math.max(0, sparkEnd - 8);
  const revSpark = sparklines.revArr.slice(sparkStart, sparkEnd);
  const profitSpark = sparklines.profitArr.slice(sparkStart, sparkEnd);
  const ordersSpark = sparklines.ordersArr.slice(sparkStart, sparkEnd);

  const prevLabel = previousMonth ? monthLabel(previousMonth) : '—';
  const subRevenue = previousMonth ? `vs ${formatRMShort(kpis.revenue.prev)} in ${prevLabel}` : 'No prior month in window';
  const subProfit = previousMonth ? `vs ${formatRMShort(kpis.profit.prev)} in ${prevLabel}` : 'Invoiced − landed cost';
  const subOrders = previousMonth ? `vs ${kpis.orders.prev} in ${prevLabel}` : 'Case-won this month';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Period
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '4px 6px' }}>
          <button
            onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
            disabled={selectedIdx === 0}
            title="Previous month"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'transparent', color: selectedIdx === 0 ? C.divider : C.green,
              fontSize: 14, fontWeight: 700, cursor: selectedIdx === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ‹
          </button>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            style={{
              border: 'none', background: 'transparent', fontFamily: 'Figtree', fontSize: 13,
              fontWeight: 700, color: C.green, outline: 'none', cursor: 'pointer', minWidth: 140, textAlign: 'center',
            }}
          >
            {months.map((m, i) => (
              <option key={m} value={i}>
                {monthFullLabel(m)}{i === months.length - 1 ? ' (current)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSelectedIdx((i) => Math.min(months.length - 1, i + 1))}
            disabled={isCurrent}
            title="Next month"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'transparent', color: isCurrent ? C.divider : C.green,
              fontSize: 14, fontWeight: 700, cursor: isCurrent ? 'not-allowed' : 'pointer',
            }}
          >
            ›
          </button>
        </div>
        {!isCurrent && (
          <button
            onClick={() => setSelectedIdx(months.length - 1)}
            style={{
              padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent',
              color: C.slate, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Jump to current
          </button>
        )}
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard
          label={`Revenue · ${monthLabel(selectedMonth)}`}
          value={formatRMShort(kpis.revenue.curr)}
          sub={subRevenue}
          trend={trendPct(kpis.revenue.curr, kpis.revenue.prev)}
          trendUp={kpis.revenue.curr >= kpis.revenue.prev}
          chart={<Sparkline data={revSpark} color={C.white} />}
          accent
        />
        <KPICard
          label={`Gross Profit · ${monthLabel(selectedMonth)}`}
          value={formatRMShort(kpis.profit.curr)}
          sub={subProfit}
          trend={trendPct(kpis.profit.curr, kpis.profit.prev)}
          trendUp={kpis.profit.curr >= kpis.profit.prev}
          chart={<Sparkline data={profitSpark} color={C.green} />}
        />
        <KPICard
          label={`Orders (Case Won) · ${monthLabel(selectedMonth)}`}
          value={kpis.orders.curr}
          sub={subOrders}
          trend={trendPct(kpis.orders.curr, kpis.orders.prev)}
          trendUp={kpis.orders.curr >= kpis.orders.prev}
          chart={<MiniBar data={ordersSpark} color={C.opal} />}
        />
        <KPICard
          label="Active Customers"
          value={kpis.activeCustomers}
          sub={`${customers.length} total · not period-filtered`}
          chart={<Sparkline data={[kpis.activeCustomers, kpis.activeCustomers]} color={C.green} />}
        />
      </div>

      {/* Wide + narrow alternating layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <RevenueCard invoices={invoices} />
        <SalesPipelineValueCard quotes={quotes} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <QuoteWinRateCard quotes={quotes} />
        <LeadSourceCard customers={customers} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <ConversionFunnelCard quotes={quotes} invoices={invoices} installationsCompleted={installationsCompleted} />
        <TopCustomersCard customers={customers} invoices={invoices} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <CashFlowCard invoices={invoices} bills={bills} expenses={expenses} />
        <LowStockCard products={products} />
      </div>
    </div>
  );
}
