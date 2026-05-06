import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Sparkline } from '@/shared/components/charts/Sparkline';
import { MiniBar } from '@/shared/components/charts/MiniBar';
import { Donut } from '@/shared/components/charts/Donut';
import { LineChart } from '@/shared/components/charts/LineChart';
import { formatRMShort } from '@/shared/lib/format';
import { useOrders } from '@/features/orders';
import { useCustomers } from '@/features/customers';
import { useInstallations } from '@/features/installations';
import { useProducts } from '@/features/products';
import {
  months,
  revenueData,
  monthlyOrdersData,
  monthlyInstallsData,
  customerGrowth,
} from './kpi-data';

export function OverviewScreen() {
  const { data: orders = [] } = useOrders();
  const { data: customers = [] } = useCustomers();
  const { data: installations = [] } = useInstallations();
  const { data: products = [] } = useProducts();

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const pipeline = [
    { label: 'New Enquiry', value: orders.filter((o) => o.status === 'Pending').length, color: C.opal },
    { label: 'In Progress', value: orders.filter((o) => o.status === 'In Progress').length, color: C.yellow },
    { label: 'Completed', value: orders.filter((o) => o.status === 'Completed').length, color: '#22a14b' },
    { label: 'Installed', value: installations.filter((i) => i.status === 'Completed').length, color: C.green },
  ];
  const maxP = Math.max(1, ...pipeline.map((p) => p.value));

  // Donut by product category
  const productCounts = new Map<string, number>();
  for (const o of orders) {
    const p = productById.get(o.product_id);
    if (!p) continue;
    productCounts.set(p.name, (productCounts.get(p.name) ?? 0) + 1);
  }
  const donutSegments = [...productCounts.entries()].slice(0, 3).map(([name, value], i) => ({
    name,
    value,
    color: [C.green, C.yellow, C.opal][i],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <KPICard
          label="Monthly Revenue"
          value={formatRMShort(revenueData[revenueData.length - 1])}
          sub={`vs ${formatRMShort(revenueData[revenueData.length - 2])} last month`}
          trend="8.5%"
          trendUp
          chart={<Sparkline data={revenueData.slice(-8)} color={C.white} />}
          accent
        />
        <KPICard
          label="Orders This Month"
          value={orders.length}
          sub={`${orders.filter((o) => o.status === 'Completed').length} completed`}
          trend="13%"
          trendUp
          chart={<MiniBar data={monthlyOrdersData} color={C.green} />}
        />
        <KPICard
          label="Installations Done"
          value={installations.filter((i) => i.status === 'Completed').length}
          sub={`${installations.filter((i) => i.status === 'Pending').length} pending · ${installations.filter((i) => i.status === 'Overdue').length} overdue`}
          trend="9.5%"
          trendUp
          chart={<MiniBar data={monthlyInstallsData} color={C.opal} />}
        />
        <KPICard
          label="Active Customers"
          value={customers.filter((c) => c.status === 'Active').length}
          sub={`${customers.length} total`}
          trend="3.9%"
          trendUp
          chart={<Sparkline data={customerGrowth} color={C.green} />}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ background: C.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Revenue Overview</div>
              <div style={{ fontSize: 12, color: C.slate }}>Jan – Dec 2025/2026</div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.green,
                background: C.honeydew,
                padding: '4px 12px',
                borderRadius: 99,
              }}
            >
              {formatRMShort(revenueData.reduce((s, v) => s + v, 0))} YTD
            </span>
          </div>
          <LineChart data={revenueData} labels={months} color={C.green} height={160} />
        </div>

        <div style={{ background: C.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 4 }}>Order Pipeline</div>
          <div style={{ fontSize: 12, color: C.slate, marginBottom: 20 }}>Current status breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pipeline.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 12, color: C.slate, width: 96, flexShrink: 0 }}>{p.label}</div>
                <div style={{ flex: 1, background: C.divider, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(p.value / maxP) * 100}%`,
                      height: '100%',
                      background: p.color,
                      borderRadius: 99,
                      transition: 'width .6s',
                    }}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.green, width: 28, textAlign: 'right' }}>
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: C.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 16 }}>Recent Orders</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.slice(0, 4).map((o, i) => {
              const customer = customerById.get(o.customer_id);
              const product = productById.get(o.product_id);
              return (
                <div
                  key={o.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingBottom: 10,
                    borderBottom: i < 3 ? `1px solid ${C.divider}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: C.honeydew,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      color: C.green,
                      flexShrink: 0,
                    }}
                  >
                    {(customer?.name ?? '?')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.green, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {customer?.name ?? o.customer_id}
                    </div>
                    <div style={{ fontSize: 11, color: C.slate }}>{product?.name ?? o.product_id}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>RM {Number(o.amount).toLocaleString()}</div>
                  <Badge status={o.status} />
                </div>
              );
            })}
            {orders.length === 0 && <div style={{ fontSize: 13, color: C.slate }}>No orders yet.</div>}
          </div>
        </div>

        <div style={{ background: C.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 4 }}>Chargers Sold</div>
          <div style={{ fontSize: 12, color: C.slate, marginBottom: 16 }}>By product</div>
          {donutSegments.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Donut segments={donutSegments.map((s) => ({ value: s.value, color: s.color }))} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {donutSegments.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 12, color: C.slate, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name.split('+')[0].trim()}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.slate }}>No order data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
