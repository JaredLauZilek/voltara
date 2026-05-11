import { createElement, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRMShort, pdfFilename } from '@/shared/lib/format';
import { useSuppliers } from '@/features/suppliers';
import { useProducts } from '@/features/products';
import { useCompanyProfile, useDesign } from '@/features/form-designs';
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useDeletePurchaseOrder } from './hooks';
import { POModal } from './POModal';
import { POPdf } from './pdf/POPdf';
import { PO_STATUSES, calcPOTotal } from './types';
import type { PurchaseOrder, PurchaseOrderInsert } from './types';

export function PurchaseOrdersScreen() {
  const { data: allPos = [] } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();
  const companyProfileQ = useCompanyProfile();
  const formDesign = useDesign('purchase_order');
  const createMut = useCreatePurchaseOrder();
  const updateMut = useUpdatePurchaseOrder();
  const deleteMut = useDeletePurchaseOrder();
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  // Only show outgoing POs (to suppliers); incoming are tracked in the Sales tab.
  const pos = allPos.filter((p) => p.direction === 'outgoing');

  const [filterStatus, setFilterStatus] = useState<'All' | PurchaseOrder['status']>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<PurchaseOrder | 'new' | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (p: PurchaseOrder) => {
    if (!companyProfileQ.data || !formDesign.design) return;
    setDownloadingId(p.id);
    try {
      const supplier = supplierById.get(p.supplier_id ?? '') ?? null;
      const blob = await pdf(
        createElement(POPdf, {
          po: p,
          supplier,
          products,
          profile: companyProfileQ.data,
          design: formDesign.design,
        }),
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFilename(p.id, supplier?.name);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  };

  // Always resolve the modal's PO against the latest query data so that after
  // a save (which invalidates the query) Print PDF renders fresh notes/totals.
  const modalPo =
    modal && modal !== 'new' ? (allPos.find((p) => p.id === modal.id) ?? modal) : null;

  const filtered = pos.filter((p) => {
    if (filterStatus !== 'All' && p.status !== filterStatus) return false;
    if (!search) return true;
    const supplierName = supplierById.get(p.supplier_id ?? '')?.name ?? '';
    return `${p.id} ${supplierName}`.toLowerCase().includes(search.toLowerCase());
  });

  const totalValue = pos.reduce((s, p) => s + calcPOTotal(p.line_items, p.discount), 0);
  const activeOrders = pos.filter((p) => ['Draft', 'Submitted', 'Approved'].includes(p.status)).length;
  const pendingDelivery = pos.filter((p) => p.status === 'Approved' || p.status === 'Submitted').length;
  const awaitingApproval = pos.filter((p) => p.status === 'Submitted').length;

  const pagination = usePagination(filtered);

  const handleSave = (row: PurchaseOrderInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      // Keep the modal open after saving an existing PO so the user can
      // immediately print the PDF if they want.
      updateMut.mutate({ id: modal.id, patch: row });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Total PO Value" value={formatRMShort(totalValue)} sub="To suppliers" accent />
        <KPICard label="Active Orders" value={activeOrders} sub="Draft + submitted + approved" />
        <KPICard label="Pending Delivery" value={pendingDelivery} sub="Submitted + approved" />
        <KPICard label="Awaiting Approval" value={awaitingApproval} sub="Submitted" />
      </div>

      <Toolbar
        filters={['All', ...PO_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as typeof filterStatus)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search PO ref / supplier…"
        primaryLabel="+ New PO"
        onPrimary={() => setModal('new')}
      />

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['PO Ref', 'Supplier', 'Total', 'Created', 'Status', ''].map((h) => (
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
            {pagination.pageItems.map((p) => {
              const supplierName = supplierById.get(p.supplier_id ?? '')?.name ?? p.supplier_id ?? '—';
              return (
                <tr
                  key={p.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(p)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{p.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{supplierName}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                    {(p.currency ?? 'RM')} {calcPOTotal(p.line_items, p.discount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{p.created_date}</td>
                  <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <POStatusSelect
                      current={p.status}
                      onChange={(next) =>
                        updateMut.mutate({ id: p.id, patch: { status: next } })
                      }
                    />
                  </td>
                  <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDownloadPdf(p)}
                      disabled={downloadingId === p.id || !companyProfileQ.data || !formDesign.design}
                      title="Download this purchase order as PDF"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: `1px solid ${C.green}`,
                        background: 'transparent',
                        color: C.green,
                        fontFamily: 'Figtree',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: downloadingId === p.id ? 'wait' : 'pointer',
                        whiteSpace: 'nowrap',
                        opacity: downloadingId === p.id ? 0.6 : 1,
                      }}
                    >
                      {downloadingId === p.id ? 'Generating…' : '⤓ PDF'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No purchase orders found.</div>
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
        <POModal
          po={modal === 'new' ? null : modalPo}
          isSaving={createMut.isPending || updateMut.isPending}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}

    </div>
  );
}

function POStatusSelect({
  current,
  onChange,
}: {
  current: PurchaseOrder['status'];
  onChange: (next: PurchaseOrder['status']) => void;
}) {
  const palette = STATUS_COLORS[current] ?? { bg: C.divider, color: C.slate };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as PurchaseOrder['status'];
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
        {PO_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}
