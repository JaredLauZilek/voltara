import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';

import { useCustomersWithStats, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from './hooks';
import { CustomerModal } from './CustomerModal';
import type { Customer, CustomerInsert, CustomerWithStats } from './types';

export function CustomersScreen() {
  const { data: customers = [], isLoading } = useCustomersWithStats();
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const deleteMut = useDeleteCustomer();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [modal, setModal] = useState<Customer | 'new' | null>(null);

  const PAGE_SIZE = 10;

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.name.toLowerCase().includes(q) && !(c.email ?? '').toLowerCase().includes(q)) return false;
    if (typeFilter !== 'All' && c.type !== typeFilter) return false;
    if (dateFrom && c.joined && c.joined < dateFrom) return false;
    if (dateTo && c.joined && c.joined > dateTo) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const pageIds = pageRows.map((c) => c.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllPage = () =>
    setSelected((prev) => {
      const n = new Set(prev);
      allPageSelected ? pageIds.forEach((id) => n.delete(id)) : pageIds.forEach((id) => n.add(id));
      return n;
    });
  const handleBulkDelete = async () => {
    await Promise.all([...selected].map((id) => deleteMut.mutateAsync(id)));
    setSelected(new Set());
    setBulkConfirm(false);
  };

  const total = customers.length;
  const byType = (['Residential', 'Commercial', 'Condo', 'CPO'] as const).map((t) => ({
    type: t,
    count: customers.filter((c) => c.type === t).length,
  }));

  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYM = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  const newlyJoined = customers.filter((c) => c.joined?.startsWith(thisYM)).length;
  const lastMonthJoined = customers.filter((c) => c.joined?.startsWith(lastYM)).length;
  const joinedDiff = newlyJoined - lastMonthJoined;

  const handleSave = (row: CustomerInsert) => {
    if (modal === 'new') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  const handleDelete = (id: string) => {
    deleteMut.mutate(id, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Total Customers" value={total} sub="All types" />
        <KPICard
          label="Newly Joined"
          value={newlyJoined}
          sub="This month"
          accent
          trend={joinedDiff !== 0 ? `${Math.abs(joinedDiff)} vs last month` : 'Same as last month'}
          trendUp={joinedDiff >= 0}
        />
        <div style={{ background: C.white, borderRadius: 16, padding: '20px 24px', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>By Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {byType.map(({ type, count }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: C.slate, width: 80, flexShrink: 0 }}>{type}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: C.seasalt, overflow: 'hidden' }}>
                  <div style={{ width: total ? `${(count / total) * 100}%` : '0%', height: '100%', borderRadius: 99, background: C.green }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.green, width: 20, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
        <KPICard label="Active" value={customers.filter((c) => c.status === 'Active').length} sub="of total" />
      </div>

      <Toolbar
        filters={['All', 'Residential', 'Commercial', 'Condo', 'CPO']}
        filter={typeFilter}
        onFilterChange={(f) => { setTypeFilter(f); resetPage(); }}
        search={search}
        onSearchChange={(s) => { setSearch(s); resetPage(); }}
        searchPlaceholder="Search customers…"
        primaryLabel="+ Add Customer"
        onPrimary={() => setModal('new')}
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: C.slate, fontWeight: 600 }}>Joined</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 12, color: dateFrom ? '#1a1a1a' : C.slate, outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: C.slate }}>—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 12, color: dateTo ? '#1a1a1a' : C.slate, outline: 'none' }}
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }}
                style={{ fontSize: 12, color: C.slate, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
              >
                ✕
              </button>
            )}
          </div>
        }
      />

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#1a1a1a', borderRadius: 12, color: C.white }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <button onClick={() => { setSelected(new Set()); setBulkConfirm(false); }} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
          {bulkConfirm ? (
            <>
              <span style={{ fontSize: 12, color: '#FFAAAA', marginLeft: 'auto' }}>
                Permanently delete {selected.size} customer{selected.size > 1 ? 's' : ''}? This cannot be undone.
              </span>
              <button onClick={handleBulkDelete} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#C0321A', color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Confirm Delete
              </button>
              <button onClick={() => setBulkConfirm(false)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setBulkConfirm(true)} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: '1px solid #C0321A', background: 'transparent', color: '#FFAAAA', fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Delete Selected
            </button>
          )}
        </div>
      )}

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              <th style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, width: 40 }}>
                <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} style={{ cursor: 'pointer', accentColor: C.green }} />
              </th>
              {['Customer', 'Email', 'Phone', 'Type', 'Lead Source', 'Status', 'Joined'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.slate,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => (
              <CustomerRow
                  key={c.id}
                  c={c}
                  selected={selected.has(c.id)}
                  onToggle={() => toggleSelect(c.id)}
                  onClick={() => {
                    // Strip computed stats — not columns on the customers table
                    const { installs: _i, spend: _s, ...customer } = c;
                    setModal(customer);
                  }}
                />
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No customers found.</div>
        )}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.slate }}>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: `1px solid ${p === safePage ? C.green : C.border}`,
                    background: p === safePage ? C.green : C.white,
                    color: p === safePage ? C.white : C.slate,
                    fontSize: 13, fontWeight: 600, fontFamily: 'Figtree', cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <CustomerModal
          customer={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function CustomerRow({ c, selected, onToggle, onClick }: { c: CustomerWithStats; selected: boolean; onToggle: () => void; onClick: () => void }) {
  return (
    <tr
      style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer', background: selected ? C.honeydew : 'transparent' }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = C.hoverRow; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <td style={{ padding: '13px 16px', width: 40 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', accentColor: C.green }} />
      </td>
      <td style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: C.honeydew,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: C.green,
              flexShrink: 0,
            }}
          >
            {c.name[0]}
          </div>
          <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{c.name}</span>
        </div>
      </td>
      <td style={{ padding: '13px 16px', color: C.slate }}>{c.email ?? '—'}</td>
      <td style={{ padding: '13px 16px' }}>
        {c.phone ? (
          <a
            href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: C.green, textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {c.phone}
          </a>
        ) : '—'}
      </td>
      <td style={{ padding: '13px 16px' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 6,
            background: c.type === 'CPO' ? C.green : c.type === 'Commercial' ? C.honeydew : c.type === 'Condo' ? '#EEF2FF' : C.divider,
            color: c.type === 'CPO' ? C.white : c.type === 'Condo' ? '#3730A3' : C.green,
          }}
        >
          {c.type}
        </span>
      </td>
      <td style={{ padding: '13px 16px', color: C.slate }}>{c.lead_source ?? '—'}</td>
      <td style={{ padding: '13px 16px' }}>
        <Badge status={c.status} />
      </td>
      <td style={{ padding: '13px 16px', color: C.slate }}>{c.joined ?? '—'}</td>
    </tr>
  );
}
