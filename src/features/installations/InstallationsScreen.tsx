import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useQuotes } from '@/features/sales';
import {
  useInstallations,
  useCreateInstallation,
  useUpdateInstallation,
  useDeleteInstallation,
} from './hooks';
import { InstallationModal } from './InstallationModal';
import { INSTALLATION_STATUSES } from './types';
import type { Installation, InstallationInsert } from './types';

type StatusFilter = 'All' | (typeof INSTALLATION_STATUSES)[number];

export function InstallationsScreen() {
  const { data: installations = [] } = useInstallations();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: quotes = [] } = useQuotes();
  const createMut = useCreateInstallation();
  const updateMut = useUpdateInstallation();
  const deleteMut = useDeleteInstallation();

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Installation | 'new' | null>(null);

  const completed = installations.filter((i) => i.status === 'Completed').length;
  const overdue = installations.filter((i) => i.status === 'Overdue').length;
  const inProgress = installations.filter((i) => i.status === 'In Progress').length;

  const techLoad = new Map<string, number>();
  for (const i of installations) {
    if (i.status === 'Pending' || i.status === 'In Progress') {
      techLoad.set(i.tech, (techLoad.get(i.tech) ?? 0) + 1);
    }
  }
  const techRows = [...techLoad.entries()].map(([name, jobs]) => ({ name, jobs, max: 6 }));

  const filtered = installations.filter((i) => {
    if (filterStatus !== 'All' && i.status !== filterStatus) return false;
    if (!search) return true;
    const customer = customerById.get(i.customer_id);
    return `${i.id} ${customer?.name ?? ''} ${i.tech}`.toLowerCase().includes(search.toLowerCase());
  });

  const pagination = usePagination(filtered);

  const handleSave = (row: InstallationInsert) => {
    if (modal === 'new') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  const productLabel = (i: Installation): string => {
    if (i.quote_id) {
      const q = quoteById.get(i.quote_id);
      const first = q?.line_items[0];
      const firstProduct = first ? productById.get(first.product_id) : null;
      const firstName = firstProduct?.name.split('+')[0].trim() ?? first?.product_id ?? '—';
      const more = (q?.line_items.length ?? 0) > 1 ? ` +${(q!.line_items.length - 1)}` : '';
      return `${firstName}${more}`;
    }
    if (i.product_id) {
      const p = productById.get(i.product_id);
      return p?.name.split('+')[0].trim() ?? i.product_id;
    }
    return '—';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Scheduled" value={installations.length} sub={`${techLoad.size} technicians active`} />
        <KPICard label="Completed" value={completed} sub="All time" accent />
        <KPICard label="In Progress" value={inProgress} sub="Currently on site" />
        <KPICard label="Overdue" value={overdue} sub="Requires rescheduling" />
      </div>

      <Toolbar
        filters={['All', ...INSTALLATION_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as StatusFilter)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ref / customer / tech…"
        primaryLabel="+ New Installation"
        onPrimary={() => setModal('new')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Installation Schedule</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Ref', 'Customer', 'Quote', 'Technician', 'Date', 'Product', 'Status'].map((h) => (
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
              {pagination.pageItems.map((r) => {
                const customer = customerById.get(r.customer_id);
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                    onClick={() => setModal(r)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: C.green }}>{r.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{customer?.name ?? r.customer_id}</td>
                    <td style={{ padding: '12px 16px', color: C.slate, fontSize: 12 }}>
                      {r.quote_id ?? <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.tech}</td>
                    <td style={{ padding: '12px 16px', color: C.slate }}>{r.scheduled}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: C.honeydew, color: C.green, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                        {productLabel(r)}
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
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
              {installations.length === 0 ? 'No installations scheduled.' : 'No installations match the filter.'}
            </div>
          )}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            from={pagination.from}
            to={pagination.to}
            onPageChange={pagination.setPage}
          />
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

      {modal && (
        <InstallationModal
          installation={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}
