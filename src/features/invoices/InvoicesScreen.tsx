import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from './hooks';
import { InvoiceModal } from './InvoiceModal';
import { ShareModal } from '@/shared/components/ShareModal';
import { calcInvoiceTotals } from './totals';
import { INVOICE_STATUSES } from './types';
import type { Invoice, InvoiceInsert } from './types';

const STATUS_COLORS: Record<Invoice['status'], { bg: string; color: string }> = {
  Draft:     { bg: '#F3F3F3', color: '#767B77' },
  Sent:      { bg: '#E3F0FF', color: '#1A62C0' },
  Paid:      { bg: '#E4F3E3', color: '#1B512D' },
  Overdue:   { bg: '#FDEAEA', color: '#C0321A' },
  Cancelled: { bg: '#FFF0E0', color: '#B45309' },
};

export function InvoicesScreen() {
  const { data: invoices = [] } = useInvoices();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const createMut = useCreateInvoice();
  const updateMut = useUpdateInvoice();
  const deleteMut = useDeleteInvoice();
  const [filter, setFilter] = useState<'All' | Invoice['status']>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Invoice | 'new' | null>(null);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);

  // Always resolve the modal's invoice against the latest query data so
  // that after a save (which invalidates the query) the modal — and any
  // child modals like the print preview — render fresh notes/totals/etc.
  const modalInvoice =
    modal && modal !== 'new' ? (invoices.find((inv) => inv.id === modal.id) ?? modal) : null;

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [p.id, p]));

  const filtered = invoices.filter((inv) => {
    if (filter !== 'All' && inv.status !== filter) return false;
    if (!search) return true;
    const customer = customerById.get(inv.customer_id);
    const haystack = `${inv.id} ${customer?.name ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const pagination = usePagination(filtered);

  const totalCollected = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((s, i) => s + calcInvoiceTotals(i.line_items, i.discount, i.tax).total, 0);
  const overdueCount = invoices.filter((i) => i.status === 'Overdue').length;
  const avgValue =
    invoices.length === 0
      ? 0
      : invoices.reduce((s, i) => s + calcInvoiceTotals(i.line_items, i.discount, i.tax).total, 0) / invoices.length;

  const handleSave = (row: InvoiceInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      // Keep the modal open after saving an existing invoice so the user can
      // immediately print the PDF if they want.
      updateMut.mutate({ id: modal.id, patch: row });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Total Invoices" value={invoices.length} sub="All time" accent />
        <KPICard label="Collected" value={formatRMShort(totalCollected)} sub="Paid invoices" />
        <KPICard label="Avg Invoice Value" value={formatRM(Math.round(avgValue))} sub="Across all" />
        <KPICard label="Overdue" value={overdueCount} sub="Requires follow-up" />
      </div>

      <Toolbar
        filters={['All', ...INVOICE_STATUSES]}
        filter={filter}
        onFilterChange={(f) => setFilter(f as typeof filter)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search invoices…"
        primaryLabel="+ New Invoice"
        onPrimary={() => setModal('new')}
      />

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Invoice ID', 'Customer', 'Items', 'Amount', 'Status', 'Issued', 'Due', ''].map((h) => (
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
            {pagination.pageItems.map((inv) => {
              const total = calcInvoiceTotals(inv.line_items, inv.discount, inv.tax).total;
              const customer = customerById.get(inv.customer_id);
              const itemSummary = inv.line_items
                .map((li) => `${li.qty}× ${productById.get(li.product_id)?.name ?? li.product_id}`)
                .join(', ');
              const sc = STATUS_COLORS[inv.status];
              return (
                <tr
                  key={inv.id}
                  style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  onClick={() => setModal(inv)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{inv.id}</td>
                  <td style={{ padding: '13px 16px', fontWeight: 600 }}>{customer?.name ?? inv.customer_id}</td>
                  <td style={{ padding: '13px 16px', color: C.slate, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {itemSummary || '—'}
                  </td>
                  <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{formatRM(total)}</td>
                  <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <InvoiceStatusSelect
                      current={inv.status}
                      palette={sc}
                      onChange={(next) =>
                        updateMut.mutate({ id: inv.id, patch: { status: next } })
                      }
                    />
                  </td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{inv.issue_date}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{inv.due_date}</td>
                  <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShareInvoice(inv)}
                      title="Share this invoice"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 8,
                        border: `1px solid ${C.border}`,
                        background: C.white,
                        color: C.green,
                        fontFamily: 'Figtree',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ↗ Share
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No invoices found.</div>
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
        <InvoiceModal
          invoice={modal === 'new' ? null : modalInvoice}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}

      {shareInvoice && (() => {
        const customer = customerById.get(shareInvoice.customer_id);
        const phone = customer?.phone ?? null;
        return (
          <ShareModal
            title="Share invoice"
            subtitle={shareInvoice.id}
            recipient={{
              name: customer?.name ?? shareInvoice.customer_id,
              sub: customer?.type ?? undefined,
            }}
            methods={[
              {
                id: 'whatsapp',
                icon: '◐',
                label: 'WhatsApp',
                hint: phone ? `Send to ${phone} (coming soon)` : 'Customer has no phone on file',
                enabled: false,
              },
              { id: 'email',     icon: '✉', label: 'Email',     hint: customer?.email ?? 'Coming soon', enabled: false },
              { id: 'copy_link', icon: '⧉', label: 'Copy Link', hint: 'Coming soon',                    enabled: false },
            ]}
            onClose={() => setShareInvoice(null)}
          />
        );
      })()}
    </div>
  );
}

function InvoiceStatusSelect({
  current,
  palette,
  onChange,
}: {
  current: Invoice['status'];
  palette: { bg: string; color: string };
  onChange: (next: Invoice['status']) => void;
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as Invoice['status'];
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
        {INVOICE_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}
