import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRMShort } from '@/shared/lib/format';
import { useBills, useCreateBill, useUpdateBill, useDeleteBill } from './hooks';
import { BillModal } from './BillModal';
import { BILL_STATUSES, BILL_CATEGORIES } from './types';
import type { Bill, BillInsert } from './types';

export function BillsScreen() {
  const { data: bills = [] } = useBills();
  const createMut = useCreateBill();
  const updateMut = useUpdateBill();
  const deleteMut = useDeleteBill();

  const [filterStatus, setFilterStatus] = useState<'All' | Bill['status']>('All');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Bill | 'new' | null>(null);

  const hasSecondary = !!filterCategory || !!filterDateFrom || !!filterDateTo;
  const clearSecondary = () => { setFilterCategory(''); setFilterDateFrom(''); setFilterDateTo(''); };

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisYear = String(now.getFullYear());

  const unpaidTotal = bills.filter((b) => b.status === 'Unpaid').reduce((s, b) => s + b.amount, 0);
  const paidThisMonth = bills.filter((b) => b.status === 'Paid' && b.paid_on?.startsWith(thisMonth)).reduce((s, b) => s + b.amount, 0);
  const overdueCount = bills.filter((b) => b.status === 'Overdue').length;
  const ytdCogs = bills.filter((b) => b.status === 'Paid' && b.paid_on?.startsWith(thisYear)).reduce((s, b) => s + b.amount, 0);

  const filtered = bills.filter((b) => {
    if (filterStatus !== 'All' && b.status !== filterStatus) return false;
    if (filterCategory && b.category !== filterCategory) return false;
    if (filterDateFrom && b.bill_date < filterDateFrom) return false;
    if (filterDateTo && b.bill_date > filterDateTo) return false;
    if (!search) return true;
    return `${b.id} ${b.vendor} ${b.reference ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });

  const pagination = usePagination(filtered);

  const handleSave = (row: BillInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Unpaid Bills" value={formatRMShort(unpaidTotal)} sub="Total outstanding" accent />
        <KPICard label="Paid This Month" value={formatRMShort(paidThisMonth)} sub="Settled in current month" />
        <KPICard label="Overdue" value={overdueCount} sub="Past due date" />
        <KPICard label="COGS YTD" value={formatRMShort(ytdCogs)} sub="Paid bills this year" />
      </div>

      <Toolbar
        filters={['All', ...BILL_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as typeof filterStatus)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search vendor / ref…"
        primaryLabel="+ New Bill"
        onPrimary={() => setModal('new')}
      />

      {/* Secondary filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${filterCategory ? C.green : C.border}`, fontFamily: 'Figtree', fontSize: 13, color: filterCategory ? C.green : C.slate, fontWeight: filterCategory ? 700 : 500, background: filterCategory ? C.honeydew : C.white, outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All categories</option>
            {BILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: C.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Bill Date</span>
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${filterDateFrom ? C.green : C.border}`, fontFamily: 'Figtree', fontSize: 13, color: filterDateFrom ? C.green : C.slate, background: filterDateFrom ? C.honeydew : C.white, outline: 'none' }} />
          <span style={{ fontSize: 12, color: C.slate }}>to</span>
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} style={{ padding: '7px 10px', borderRadius: 10, border: `1px solid ${filterDateTo ? C.green : C.border}`, fontFamily: 'Figtree', fontSize: 13, color: filterDateTo ? C.green : C.slate, background: filterDateTo ? C.honeydew : C.white, outline: 'none' }} />
        </div>

        {hasSecondary && (
          <button onClick={clearSecondary} style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Clear filters
          </button>
        )}
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Bill Ref', 'Vendor', 'Category', 'Amount', 'Bill Date', 'Due Date', 'Invoice Ref', '📎', 'Status'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((b) => {
              const isOverdue = b.status === 'Unpaid' && b.due_date && b.due_date < new Date().toISOString().slice(0, 10);
              return (
                <tr
                  key={b.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(b)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{b.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{b.vendor}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.divider, color: C.slate }}>{b.category}</span>
                  </td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                    {(b.currency ?? 'RM')} {b.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{b.bill_date}</td>
                  <td style={{ padding: '13px 16px', color: isOverdue ? '#C0321A' : C.slate, fontWeight: isOverdue ? 700 : 400 }}>
                    {b.due_date ?? '—'}
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>{b.reference ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: b.attachments.length > 0 ? C.green : C.slate, fontWeight: 600, fontSize: 12 }}>
                    {b.attachments.length > 0 ? b.attachments.length : '—'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <StatusSelect current={b.status} onChange={(s) => updateMut.mutate({ id: b.id, patch: { status: s, paid_on: s === 'Paid' && !b.paid_on ? new Date().toISOString().slice(0, 10) : s !== 'Paid' ? null : b.paid_on } })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No bills found.</div>
        )}
        <Pagination page={pagination.page} totalPages={pagination.totalPages} totalItems={pagination.totalItems} pageSize={pagination.pageSize} from={pagination.from} to={pagination.to} onPageChange={pagination.setPage} />
      </div>

      {modal && (
        <BillModal
          bill={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id, attachments) => deleteMut.mutate({ id, attachments }, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}

function StatusSelect({ current, onChange }: { current: Bill['status']; onChange: (s: Bill['status']) => void }) {
  const palette = STATUS_COLORS[current] ?? { bg: C.divider, color: C.slate };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => { const next = e.target.value as Bill['status']; if (next !== current) onChange(next); }}
        style={{ appearance: 'none', WebkitAppearance: 'none', background: palette.bg, color: palette.color, border: 'none', borderRadius: 99, padding: '3px 26px 3px 10px', fontSize: 11, fontWeight: 700, fontFamily: 'Figtree', cursor: 'pointer', letterSpacing: '0.03em', outline: 'none' }}
      >
        {BILL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}
