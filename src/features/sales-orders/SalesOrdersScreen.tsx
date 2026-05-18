import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRMShort } from '@/shared/lib/format';
import { useCustomers } from '@/features/customers';
import { useSalesOrders, useCreateSalesOrder, useUpdateSalesOrder, useDeleteSalesOrder } from './hooks';
import { SalesOrderModal } from './SalesOrderModal';
import { SO_STATUSES, calcSOTotal } from './types';
import type { SalesOrder, SalesOrderInsert } from './types';

export function SalesOrdersScreen() {
  const { data: sos = [] } = useSalesOrders();
  const { data: customers = [] } = useCustomers();
  const createMut = useCreateSalesOrder();
  const updateMut = useUpdateSalesOrder();
  const deleteMut = useDeleteSalesOrder();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const [filterStatus, setFilterStatus] = useState<'All' | SalesOrder['status']>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<SalesOrder | 'new' | null>(null);

  // Live-derive the modal target from the cached list (§12) so Print/Save
  // reflect the latest persisted state after a mutation invalidation.
  const modalSO =
    modal && modal !== 'new' ? (sos.find((s) => s.id === modal.id) ?? modal) : null;

  const filtered = sos.filter((s) => {
    if (filterStatus !== 'All' && s.status !== filterStatus) return false;
    if (!search) return true;
    const customerName = customerById.get(s.customer_id)?.name ?? '';
    return `${s.id} ${customerName} ${s.customer_po_ref}`.toLowerCase().includes(search.toLowerCase());
  });

  const totalOrderValue = sos
    .filter((s) => s.status !== 'Cancelled')
    .reduce((sum, s) => sum + calcSOTotal(s.line_items, s.discount), 0);
  const openCount = sos.filter((s) => s.status === 'Open').length;
  const confirmedCount = sos.filter((s) => s.status === 'Confirmed').length;
  const fulfilledCount = sos.filter((s) => s.status === 'Fulfilled').length;

  const pagination = usePagination(filtered);

  const handleSave = (row: SalesOrderInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string') {
      // Keep the modal open after editing so the user can adjust attachments
      // / line items further without re-opening it.
      updateMut.mutate({ id: modal.id, patch: row });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard
          label="Order Value"
          value={formatRMShort(totalOrderValue)}
          sub="Open + Confirmed + Fulfilled"
          accent
        />
        <KPICard label="Open" value={openCount} sub="Customer PO received" />
        <KPICard label="Confirmed" value={confirmedCount} sub="Scheduled for fulfilment" />
        <KPICard label="Fulfilled" value={fulfilledCount} sub="Delivered / installed" />
      </div>

      <Toolbar
        filters={['All', ...SO_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as typeof filterStatus)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search SO ref / customer / customer PO…"
        primaryLabel="+ New Sales Order"
        onPrimary={() => setModal('new')}
      />

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['SO Ref', 'Customer', 'Customer PO', 'Total', 'Created', 'Status'].map((h) => (
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
            {pagination.pageItems.map((s) => {
              const customerName = customerById.get(s.customer_id)?.name ?? s.customer_id ?? '—';
              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(s)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{s.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{customerName}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{s.customer_po_ref}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>{s.customer_po_date}</div>
                  </td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                    RM {calcSOTotal(s.line_items, s.discount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{s.created_date}</td>
                  <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <SOStatusSelect
                      current={s.status}
                      onChange={(next) => updateMut.mutate({ id: s.id, patch: { status: next } })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No sales orders yet. Create one from a Case Won quote.
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

      {modal && (
        <SalesOrderModal
          so={modal === 'new' ? null : modalSO}
          isSaving={createMut.isPending || updateMut.isPending}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => {
            const target = sos.find((s) => s.id === id);
            deleteMut.mutate(
              { id, attachments: target?.attachments ?? [] },
              { onSuccess: () => setModal(null) },
            );
          }}
        />
      )}
    </div>
  );
}

function SOStatusSelect({
  current,
  onChange,
}: {
  current: SalesOrder['status'];
  onChange: (next: SalesOrder['status']) => void;
}) {
  // Map SO statuses to the shared palette in tokens. 'Open' isn't a canonical
  // entry there, so fall back to the 'Pending' colours which match its semantics.
  const palette =
    STATUS_COLORS[current] ?? (current === 'Open' ? STATUS_COLORS.Pending : { bg: C.divider, color: C.slate });
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as SalesOrder['status'];
          if (next !== current) onChange(next);
        }}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: palette.bg,
          color: palette.color,
          border: 'none',
          borderRadius: 99,
          padding: '3px 26px 3px 10px',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'Figtree',
          cursor: 'pointer',
          letterSpacing: '0.03em',
          outline: 'none',
        }}
      >
        {SO_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}
