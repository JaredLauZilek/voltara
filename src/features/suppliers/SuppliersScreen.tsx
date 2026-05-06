import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { formatRMShort } from '@/shared/lib/format';
import {
  useSuppliersWithStats,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from './hooks';
import { SupplierModal } from './SupplierModal';
import { SUPPLIER_CATEGORIES } from './types';
import type { Supplier, SupplierInsert, SupplierWithStats } from './types';

export function SuppliersScreen() {
  const { data: suppliers = [] } = useSuppliersWithStats();
  const createMut = useCreateSupplier();
  const updateMut = useUpdateSupplier();
  const deleteMut = useDeleteSupplier();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<'All' | (typeof SUPPLIER_CATEGORIES)[number]>('All');
  const [modal, setModal] = useState<Supplier | 'new' | null>(null);

  const filtered = suppliers.filter(
    (s) =>
      (filterCat === 'All' || s.category === filterCat) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contact ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const active = suppliers.filter((s) => s.status === 'Active').length;
  const prospects = suppliers.filter((s) => s.status === 'Prospect').length;
  const totalSpend = suppliers.reduce((sum, s) => sum + s.total_spend, 0);
  const avgRating =
    suppliers.filter((s) => s.rating != null).reduce((sum, s) => sum + (s.rating ?? 0), 0) /
    Math.max(1, suppliers.filter((s) => s.rating != null).length);

  const handleSave = (row: SupplierInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Active Suppliers" value={active} sub={`${suppliers.length} total`} accent />
        <KPICard label="Total Spend YTD" value={formatRMShort(totalSpend)} sub="Outgoing POs" />
        <KPICard label="Avg Rating" value={`${avgRating.toFixed(1)} ★`} sub="Across rated suppliers" />
        <KPICard label="Prospects" value={prospects} sub="Under evaluation" />
      </div>

      <Toolbar
        filters={['All', ...SUPPLIER_CATEGORIES]}
        filter={filterCat}
        onFilterChange={(f) => setFilterCat(f as typeof filterCat)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search suppliers…"
        primaryLabel="+ New Supplier"
        onPrimary={() => setModal('new')}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {filtered.map((s) => (
          <SupplierCard key={s.id} s={s} onClick={() => setModal(s)} />
        ))}
      </div>

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
          No suppliers found.
        </div>
      )}

      {modal && (
        <SupplierModal
          supplier={modal === 'new' ? null : modal}
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
          <div style={{ color: C.slate, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>POs</div>
          <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{s.po_count}</div>
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
