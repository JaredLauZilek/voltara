import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useCustomers } from '@/features/customers';
import { useSuppliers } from '@/features/suppliers';
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder } from './hooks';
import { POModal } from './POModal';
import { PO_STATUSES, calcPOTotal } from './types';
import type { PurchaseOrder, PurchaseOrderInsert } from './types';

export function PurchaseOrdersScreen() {
  const { data: pos = [] } = usePurchaseOrders();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const deleteMut = useDeletePurchaseOrder();
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const [direction, setDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [filterStatus, setFilterStatus] = useState<'All' | PurchaseOrder['status']>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<PurchaseOrder | 'new' | null>(null);

  const directional = pos.filter((p) => p.direction === direction);
  const filtered = directional.filter((p) => {
    if (filterStatus !== 'All' && p.status !== filterStatus) return false;
    if (!search) return true;
    const partyName =
      p.direction === 'outgoing'
        ? supplierById.get(p.supplier_id ?? '')?.name ?? ''
        : customerById.get(p.customer_id ?? '')?.name ?? '';
    return `${p.id} ${partyName}`.toLowerCase().includes(search.toLowerCase());
  });

  const outgoingValue = pos
    .filter((p) => p.direction === 'outgoing')
    .reduce((s, p) => s + calcPOTotal(p.line_items, p.discount), 0);
  const incomingValue = pos
    .filter((p) => p.direction === 'incoming')
    .reduce((s, p) => s + calcPOTotal(p.line_items, p.discount), 0);
  const pendingDelivery = pos.filter((p) => p.status === 'Approved' || p.status === 'Submitted').length;
  const awaitingApproval = pos.filter((p) => p.status === 'Submitted').length;

  const filteredTotal = filtered.reduce((s, p) => s + calcPOTotal(p.line_items, p.discount), 0);

  const handleSave = (row: PurchaseOrderInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Outgoing Value" value={formatRMShort(outgoingValue)} sub="To suppliers" accent />
        <KPICard label="Incoming Value" value={formatRMShort(incomingValue)} sub="From customers" />
        <KPICard label="Pending Delivery" value={pendingDelivery} sub="Submitted + approved" />
        <KPICard label="Awaiting Approval" value={awaitingApproval} sub="Submitted" />
      </div>

      <Toolbar
        filters={['All', ...PO_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as typeof filterStatus)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search PO ref / party…"
        primaryLabel="+ New PO"
        onPrimary={() => setModal('new')}
        extra={
          <div style={{ display: 'flex', gap: 4, background: C.divider, borderRadius: 99, padding: 3 }}>
            {(['outgoing', 'incoming'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: 'none',
                  background: direction === d ? C.white : 'transparent',
                  color: direction === d ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {d === 'outgoing' ? '↑ Outgoing' : '↓ Incoming'}
              </button>
            ))}
          </div>
        }
      />

      <div style={{ background: C.honeydew, borderRadius: 12, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>
          {direction === 'outgoing' ? 'Orders to suppliers' : 'Orders from customers'} — {filtered.length} shown
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{formatRM(filteredTotal)}</span>
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['PO Ref', direction === 'outgoing' ? 'Supplier' : 'Customer', 'Items', 'Total', 'Created', 'Delivery', 'Ext Ref', 'Status'].map((h) => (
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
            {filtered.map((p) => {
              const partyName =
                p.direction === 'outgoing'
                  ? supplierById.get(p.supplier_id ?? '')?.name ?? p.supplier_id
                  : customerById.get(p.customer_id ?? '')?.name ?? p.customer_id;
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(p)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{p.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{partyName ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{p.line_items.length} item(s)</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                    {formatRM(calcPOTotal(p.line_items, p.discount))}
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{p.created_date}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{p.delivery_date ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{p.external_ref ?? '—'}</td>
                  <td style={{ padding: '13px 16px' }}>
                    <Badge status={p.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No purchase orders found.</div>
        )}
      </div>

      {modal && (
        <POModal
          po={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}
