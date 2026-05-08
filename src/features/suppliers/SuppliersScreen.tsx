import { useEffect, useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRMShort } from '@/shared/lib/format';
import {
  useSuppliersWithStats,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useSupplierCategories,
} from './hooks';
import { SupplierModal } from './SupplierModal';
import { SUPPLIER_KINDS } from './types';
import type { Supplier, SupplierInsert, SupplierWithStats, SupplierKind } from './types';

const KIND_LABELS: Record<SupplierKind, { plural: string; singular: string }> = {
  Supplier:   { plural: 'Suppliers',   singular: 'Supplier' },
  Vendor:     { plural: 'Vendors',     singular: 'Vendor' },
  Contractor: { plural: 'Contractors', singular: 'Contractor' },
};

export function SuppliersScreen() {
  const { data: suppliers = [] } = useSuppliersWithStats();
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();
  const deleteMut = useDeleteSupplier();
  const [tab, setTab] = useState<SupplierKind>('Supplier');
  const { data: categories = [] } = useSupplierCategories(tab);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('All');
  const [modal, setModal] = useState<Supplier | 'new' | null>(null);

  // Clear any stale mutation error whenever the modal opens or closes — otherwise
  // TanStack Query keeps the previous failure visible forever.
  useEffect(() => {
    createMut.reset();
    updateMut.reset();
  }, [modal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suppliers without an explicit kind (legacy rows) fall back to "Supplier".
  const inTab = suppliers.filter((s) => (s.kind ?? 'Supplier') === tab);

  const filtered = inTab.filter(
    (s) =>
      (filterCat === 'All' || s.category === filterCat) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const pagination = usePagination(filtered, 9);

  const active = inTab.filter((s) => s.status === 'Active').length;
  const prospects = inTab.filter((s) => s.status === 'Prospect').length;
  const totalSpend = inTab.reduce((sum, s) => sum + s.total_spend, 0);
  const ratedRows = inTab.filter((s) => s.rating != null);
  const avgRating =
    ratedRows.reduce((sum, s) => sum + (s.rating ?? 0), 0) / Math.max(1, ratedRows.length);
  const labels = KIND_LABELS[tab];

  const handleSave = (row: SupplierInsert) => {
    // Strip view-only fields that leak in via SupplierWithStats — Supabase rejects
    // updates that include columns outside the suppliers table.
    const { po_count: _pc, total_spend: _ts, ...patch } = row as SupplierInsert & {
      po_count?: number;
      total_spend?: number;
    };
    void _pc; void _ts;
    if (modal === 'new') createMut.mutate(patch, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      updateMut.mutate({ id: modal.id, patch }, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${C.border}` }}>
        {SUPPLIER_KINDS.map((k) => {
          const isActive = tab === k;
          const count = suppliers.filter((s) => (s.kind ?? 'Supplier') === k).length;
          return (
            <button
              key={k}
              onClick={() => { setTab(k); setFilterCat('All'); }}
              style={{
                padding: '10px 18px',
                marginBottom: -1,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? C.green : 'transparent'}`,
                color: isActive ? C.green : C.slate,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {KIND_LABELS[k].plural} <span style={{ fontWeight: 600, color: isActive ? C.green : C.slate, opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label={`Active ${labels.plural}`} value={active} sub={`${inTab.length} total`} accent />
        <KPICard label="Total Spend YTD" value={formatRMShort(totalSpend)} sub="Outgoing POs" />
        <KPICard label="Avg Rating" value={`${avgRating.toFixed(1)} ★`} sub={`Across rated ${labels.plural.toLowerCase()}`} />
        <KPICard label="Prospects" value={prospects} sub="Under evaluation" />
      </div>

      <Toolbar
        filters={['All', ...categories]}
        filter={filterCat}
        onFilterChange={setFilterCat}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${labels.plural.toLowerCase()}…`}
        primaryLabel={`+ New ${labels.singular}`}
        onPrimary={() => setModal('new')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {pagination.pageItems.map((s) => (
          <SupplierCard key={s.id} s={s} onClick={() => setModal(s)} />
        ))}
      </div>

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

      {filtered.length === 0 && (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: C.slate,
            fontSize: 14,
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          No {labels.plural.toLowerCase()} found.
        </div>
      )}

      {modal && (
        <SupplierModal
          supplier={modal === 'new' ? null : modal}
          defaultKind={tab}
          isSaving={createMut.isPending || updateMut.isPending}
          saveError={(createMut.error ?? updateMut.error) as Error | null}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}

function SupplierCard({ s, onClick }: { s: SupplierWithStats; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        borderRadius: 16,
        padding: '20px 24px',
        border: `1px solid ${C.border}`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{s.name}</div>
          <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{s.category}</div>
        </div>
        <Badge status={s.status} />
      </div>
      <div style={{ fontSize: 12, color: C.slate }}>{s.contact ?? '—'}</div>
      <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: `1px solid ${C.divider}`, fontSize: 12 }}>
        <div>
          <div style={{ color: C.slate, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Spend</div>
          <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{formatRMShort(s.total_spend)}</div>
        </div>
        <div>
          <div style={{ color: C.slate, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Lead</div>
          <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{s.lead_time_days ?? '—'}d</div>
        </div>
        {s.rating != null && (
          <div style={{ marginLeft: 'auto' }}>
            <div style={{ color: C.slate, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Rating</div>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{s.rating} ★</div>
          </div>
        )}
      </div>
    </div>
  );
}
