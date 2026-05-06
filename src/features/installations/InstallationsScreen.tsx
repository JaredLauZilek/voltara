import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useInstallations } from './hooks';

export function InstallationsScreen() {
  const { data: installations = [] } = useInstallations();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const completed = installations.filter((i) => i.status === 'Completed').length;
  const overdue = installations.filter((i) => i.status === 'Overdue').length;
  const inProgress = installations.filter((i) => i.status === 'In Progress').length;

  // Aggregate technician load from data
  const techLoad = new Map<string, number>();
  for (const i of installations) {
    if (i.status === 'Pending' || i.status === 'In Progress') {
      techLoad.set(i.tech, (techLoad.get(i.tech) ?? 0) + 1);
    }
  }
  const techRows = [...techLoad.entries()].map(([name, jobs]) => ({ name, jobs, max: 6 }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Scheduled" value={installations.length} sub={`${techLoad.size} technicians active`} />
        <KPICard label="Completed" value={completed} sub="All time" accent />
        <KPICard label="In Progress" value={inProgress} sub="Currently on site" />
        <KPICard label="Overdue" value={overdue} sub="Requires rescheduling" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Installation Schedule</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Ref', 'Customer', 'Technician', 'Date', 'Product', 'Status'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.slate,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {installations.map((r) => {
                const customer = customerById.get(r.customer_id);
                const product = productById.get(r.product_id);
                return (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: C.green }}>{r.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{customer?.name ?? r.customer_id}</td>
                    <td style={{ padding: '12px 16px' }}>{r.tech}</td>
                    <td style={{ padding: '12px 16px', color: C.slate }}>{r.scheduled}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: C.honeydew, color: C.green, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                        {product?.name.split('+')[0].trim() ?? r.product_id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge status={r.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {installations.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No installations scheduled.</div>
          )}
        </div>

        <div style={{ background: C.white, borderRadius: 16, padding: 20, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 4 }}>Technician Load</div>
          <div style={{ fontSize: 12, color: C.slate, marginBottom: 16 }}>Active jobs</div>
          {techRows.length === 0 && <div style={{ fontSize: 12, color: C.slate }}>No active jobs.</div>}
          {techRows.map((t) => (
            <div key={t.name} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                <span style={{ fontSize: 12, color: C.slate }}>
                  {t.jobs}/{t.max}
                </span>
              </div>
              <div style={{ background: C.divider, borderRadius: 99, height: 7 }}>
                <div
                  style={{
                    width: `${(t.jobs / t.max) * 100}%`,
                    height: '100%',
                    background: t.jobs >= t.max - 1 ? C.yellow : C.green,
                    borderRadius: 99,
                    transition: 'width .5s',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
