import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useQuotes } from '@/features/sales';
import { calcQuoteTotal } from '@/features/sales';
import { useSalesManagers, useCreateSalesManager, useUpdateSalesManager, useDeleteSalesManager } from './hooks';
import { SalesManagerModal } from './SalesManagerModal';
import type { SalesManager, SalesManagerInsert } from './types';

type ModalMode = SalesManager | 'new' | null;

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  borderBottom: `1px solid ${C.border}`,
};

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

  const handleSave = (row: SalesManagerInsert) => {
    if (modal === 'new') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  // Per-manager KPIs derived from quotes
  const managerStats = (managerId: string) => {
    const mQuotes = quotes.filter((q) => q.sales_manager_id === managerId);
    const pipeline = mQuotes
      .filter((q) => ['Draft', 'Sent'].includes(q.status))
      .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
    const won = mQuotes
      .filter((q) => q.status === 'Case Won')
      .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
    const decided = mQuotes.filter((q) => ['Case Won', 'Case Lost', 'Expired'].includes(q.status));
    const winRate = decided.length > 0
      ? (decided.filter((q) => q.status === 'Case Won').length / decided.length) * 100
      : 0;
    return { pipeline, won, winRate, totalQuotes: mQuotes.length };
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

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['ID', 'Name', 'Email', 'Phone', 'Open Pipeline', 'Revenue Won', 'Win Rate', 'Target (RM/mo)', 'Status'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const { pipeline, won, winRate } = managerStats(m.id);
              const targetPct = m.target_revenue > 0 ? Math.min(100, (won / m.target_revenue) * 100) : 0;
              return (
                <tr
                  key={m.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(m)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{m.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{m.name}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{m.email ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{m.phone ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{formatRM(pipeline)}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{formatRM(won)}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{winRate.toFixed(0)}%</td>
                  <td style={{ padding: '13px 16px', minWidth: 160 }}>
                    <div style={{ fontSize: 12, color: C.slate }}>
                      {formatRM(m.target_revenue)}
                    </div>
                    {m.target_revenue > 0 && (
                      <div style={{ background: C.divider, borderRadius: 99, height: 5, marginTop: 4 }}>
                        <div style={{ width: `${targetPct}%`, height: '100%', background: targetPct >= 100 ? C.green : C.opal, borderRadius: 99 }} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <Badge status={m.active ? 'Active' : 'Inactive'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No managers found. Click <strong>+ New Manager</strong> to add one.
          </div>
        )}
      </div>

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
