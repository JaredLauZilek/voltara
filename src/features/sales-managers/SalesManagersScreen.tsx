import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useQuotes } from '@/features/sales';
import { calcQuoteTotal } from '@/features/sales';
import { useSalesManagers, useCreateSalesManager, useUpdateSalesManager, useDeleteSalesManager } from './hooks';
import { SalesManagerModal } from './SalesManagerModal';
import type { SalesManager, SalesManagerInsert } from './types';

type ModalMode = SalesManager | 'new' | null;

function Avatar({ photo, name, size = 64 }: { photo: string | null; name: string; size?: number }) {
  const initials = name.trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return photo ? (
    <img
      src={photo}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: C.honeydew,
        color: C.green,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.34,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export function SalesManagersScreen() {
  const { data: managers = [] } = useSalesManagers();
  const { data: quotes = [] } = useQuotes();
  const createMut = useCreateSalesManager();
  const updateMut = useUpdateSalesManager();
  const deleteMut = useDeleteSalesManager();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [modal, setModal] = useState<ModalMode>(null);

  const filtered = managers.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'Active') return m.active;
    if (filterStatus === 'Inactive') return !m.active;
    return true;
  });

  const pagination = usePagination(filtered, 9);

  const handleSave = (row: SalesManagerInsert) => {
    if (modal === 'new') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  const managerStats = (managerId: string) => {
    const mQuotes = quotes.filter((q) => q.sales_manager_id === managerId);
    const pipeline = mQuotes
      .filter((q) => ['Draft', 'Sent'].includes(q.status))
      .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
    const wonQuotes = mQuotes.filter((q) => q.status === 'Case Won');
    const won = wonQuotes.reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
    const wonThisMonth = wonQuotes
      .filter((q) => q.won_at && q.won_at.slice(0, 7) === thisMonth)
      .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
    const decided = mQuotes.filter((q) => ['Case Won', 'Case Lost', 'Expired'].includes(q.status));
    const winRate = decided.length > 0
      ? (decided.filter((q) => q.status === 'Case Won').length / decided.length) * 100
      : 0;
    return { pipeline, won, wonThisMonth, winRate, totalQuotes: mQuotes.length };
  };

  const totalPipeline = managers.reduce((s, m) => s + managerStats(m.id).pipeline, 0);
  const totalWon = managers.reduce((s, m) => s + managerStats(m.id).won, 0);
  const activeCount = managers.filter((m) => m.active).length;
  const allDecided = quotes.filter((q) => ['Case Won', 'Case Lost', 'Expired'].includes(q.status));
  const overallWinRate = allDecided.length > 0
    ? (allDecided.filter((q) => q.status === 'Case Won').length / allDecided.length) * 100
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Active Sales Managers" value={activeCount} sub="On team" accent />
        <KPICard label="Total Open Pipeline" value={formatRMShort(totalPipeline)} sub="Draft + Sent quotes" />
        <KPICard label="Total Revenue Won" value={formatRMShort(totalWon)} sub="Case Won deals" />
        <KPICard label="Overall Win Rate" value={`${overallWinRate.toFixed(0)}%`} sub="Cases Won / decided" />
      </div>

      <Toolbar
        filters={['All', 'Active', 'Inactive']}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as typeof filterStatus)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search managers…"
        primaryLabel="+ New Manager"
        onPrimary={() => setModal('new')}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: C.slate, fontSize: 14 }}>
          {managers.length === 0
            ? <>No managers yet. Click <strong>+ New Manager</strong> to add one.</>
            : 'No managers match the filter.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {pagination.pageItems.map((m) => {
            const { pipeline, won, wonThisMonth, winRate } = managerStats(m.id);
            const targetPct = m.target_revenue > 0 ? Math.min(100, (wonThisMonth / m.target_revenue) * 100) : 0;
            return (
              <div
                key={m.id}
                onClick={() => setModal(m)}
                style={{
                  background: C.white,
                  borderRadius: 16,
                  border: `1px solid ${C.border}`,
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  transition: 'box-shadow 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Top: avatar + name + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar photo={m.photo_data_url} name={m.name} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{m.id}</div>
                  </div>
                  <Badge status={m.active ? 'Active' : 'Inactive'} />
                </div>

                {/* Contact */}
                {(m.email || m.phone) && (
                  <div style={{ fontSize: 12, color: C.slate, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {m.email && <span>{m.email}</span>}
                    {m.phone && <span>{m.phone}</span>}
                  </div>
                )}

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div style={{ background: C.seasalt, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Pipeline</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{formatRMShort(pipeline)}</div>
                  </div>
                  <div style={{ background: C.seasalt, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Won</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{formatRMShort(won)}</div>
                  </div>
                  <div style={{ background: C.seasalt, borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Win Rate</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: winRate >= 50 ? C.green : C.slate }}>{winRate.toFixed(0)}%</div>
                  </div>
                </div>

                {/* Target progress */}
                {m.target_revenue > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Target</span>
                      <span style={{ fontSize: 11, color: C.slate }}>{formatRM(wonThisMonth)} / {formatRM(m.target_revenue)}</span>
                    </div>
                    <div style={{ background: C.divider, borderRadius: 99, height: 6 }}>
                      <div
                        style={{
                          width: `${targetPct}%`,
                          height: '100%',
                          background: targetPct >= 100 ? C.green : C.opal,
                          borderRadius: 99,
                          transition: 'width .4s',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
        bordered={false}
      />

      {modal && (
        <SalesManagerModal
          manager={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}
