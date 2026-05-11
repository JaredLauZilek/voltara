import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useQuotes } from '@/features/sales';
import { useDesign } from '@/features/form-designs';
import {
  useInstallations,
  useCreateInstallation,
  useUpdateInstallation,
  useDeleteInstallation,
} from './hooks';
import { InstallationModal } from './InstallationModal';
import { INSTALLATION_STATUSES } from './types';
import type { Installation, InstallationInsert } from './types';
import { DeliveryOrderPrintModal } from './pdf';
import { ShareModal } from '@/shared/components/ShareModal';
import { DeliveryOrderEmailModal } from './email';

type StatusFilter = 'All' | (typeof INSTALLATION_STATUSES)[number];

export function InstallationsScreen() {
  const { data: installations = [] } = useInstallations();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();
  const { data: quotes = [] } = useQuotes();
  const { profile, design } = useDesign('delivery_order');
  const createMut = useCreateInstallation();
  const updateMut = useUpdateInstallation();
  const deleteMut = useDeleteInstallation();

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Installation | 'new' | null>(null);
  const [printRow, setPrintRow] = useState<Installation | null>(null);
  const [shareRow, setShareRow] = useState<Installation | null>(null);
  const [emailRow, setEmailRow] = useState<Installation | null>(null);

  const completed = installations.filter((i) => i.status === 'Completed').length;
  const overdue = installations.filter((i) => i.status === 'Overdue').length;
  const inProgress = installations.filter((i) => i.status === 'In Progress').length;

  const filtered = installations.filter((i) => {
    if (filterStatus !== 'All' && i.status !== filterStatus) return false;
    if (!search) return true;
    const customer = customerById.get(i.customer_id);
    return `${i.id} ${customer?.name ?? ''} ${i.tech}`.toLowerCase().includes(search.toLowerCase());
  });

  const pagination = usePagination(filtered);

  // Live-derived (§12) so the modal reflects the persisted state right after
  // an edit-save — without this, the prop keeps pointing at the snapshot
  // captured when the row was clicked, and any post-save indicators (like the
  // qty-override badge) wouldn't update.
  const modalRow =
    modal && modal !== 'new' ? (installations.find((r) => r.id === modal.id) ?? modal) : null;

  const handleSave = (row: InstallationInsert) => {
    if (modal === 'new') {
      // Create flow: close the modal so the table can refresh and the user
      // sees the new row immediately.
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      // Edit flow: keep the modal open per §11 so the user can click Download
      // Delivery Order / continue editing without re-opening.
      updateMut.mutate({ id: modal.id, patch: row });
    }
  };

  const productLabel = (i: Installation): string => {
    if (i.quote_id) {
      const q = quoteById.get(i.quote_id);
      const first = q?.line_items[0];
      const firstProduct = first ? productById.get(first.product_id) : null;
      const firstName = firstProduct?.name.split('+')[0].trim() ?? first?.product_id ?? '—';
      const more = (q?.line_items.length ?? 0) > 1 ? ` +${(q!.line_items.length - 1)}` : '';
      return `${firstName}${more}`;
    }
    if (i.product_id) {
      const p = productById.get(i.product_id);
      return p?.name.split('+')[0].trim() ?? i.product_id;
    }
    return '—';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Scheduled" value={installations.length} sub="Across all installations" />
        <KPICard label="Completed" value={completed} sub="All time" accent />
        <KPICard label="In Progress" value={inProgress} sub="Currently on site" />
        <KPICard label="Overdue" value={overdue} sub="Requires rescheduling" />
      </div>

      <Toolbar
        filters={['All', ...INSTALLATION_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as StatusFilter)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ref / customer / contractor…"
        primaryLabel="+ New Installation"
        onPrimary={() => setModal('new')}
      />

      <div>
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Installation Schedule</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Ref', 'Customer', 'Quote', 'Contractor', 'Date', 'Product', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: C.slate,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((r) => {
                const customer = customerById.get(r.customer_id);
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                    onClick={() => setModal(r)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: C.green }}>{r.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{customer?.name ?? r.customer_id}</td>
                    <td style={{ padding: '12px 16px', color: C.slate, fontSize: 12 }}>
                      {r.quote_id ?? <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{r.tech}</td>
                    <td style={{ padding: '12px 16px', color: C.slate }}>{r.scheduled}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: C.honeydew, color: C.green, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                        {productLabel(r)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <InstallationStatusSelect
                        current={r.status}
                        onChange={(next) =>
                          updateMut.mutate({ id: r.id, patch: { status: next } })
                        }
                      />
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.status === 'Completed' && profile && design ? (
                          <>
                            <button
                              onClick={() => setPrintRow(r)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: `1px solid ${C.green}`,
                                background: 'transparent',
                                color: C.green,
                                fontFamily: 'Figtree',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ⤓ DO
                            </button>
                            <button
                              onClick={() => setShareRow(r)}
                              title="Share this delivery order"
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: `1px solid ${C.border}`,
                                background: C.white,
                                color: C.green,
                                fontFamily: 'Figtree',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              ↗ Share
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
              {installations.length === 0 ? 'No installations scheduled.' : 'No installations match the filter.'}
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

      </div>

      {modal && (
        <InstallationModal
          installation={modal === 'new' ? null : modalRow}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}

      {printRow && (
        <DeliveryOrderPrintModal
          installation={printRow}
          onClose={() => setPrintRow(null)}
        />
      )}

      {shareRow && (() => {
        const customer = customerById.get(shareRow.customer_id);
        return (
          <ShareModal
            title="Share delivery order"
            subtitle={shareRow.id}
            recipient={{
              name: customer?.name ?? shareRow.customer_id,
              sub: customer?.type ?? undefined,
            }}
            methods={[
              {
                id: 'whatsapp',
                icon: '◐',
                label: 'WhatsApp',
                hint: customer?.phone ? `Send to ${customer.phone} (coming soon)` : 'Customer has no phone on file',
                enabled: false,
              },
              {
                id: 'email',
                icon: '✉',
                label: 'Email',
                hint: customer?.email ? `Send to ${customer.email} via Resend` : 'Customer has no email on file',
                enabled: !!customer?.email,
                onClick: () => { const r = shareRow; setShareRow(null); setEmailRow(r); },
              },
              { id: 'copy_link', icon: '⧉', label: 'Copy Link', hint: 'Coming soon', enabled: false },
            ]}
            onClose={() => setShareRow(null)}
          />
        );
      })()}

      {emailRow && (
        <DeliveryOrderEmailModal installation={emailRow} onClose={() => setEmailRow(null)} />
      )}
    </div>
  );
}

function InstallationStatusSelect({
  current,
  onChange,
}: {
  current: Installation['status'];
  onChange: (next: Installation['status']) => void;
}) {
  const palette = STATUS_COLORS[current] ?? { bg: C.divider, color: C.slate };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as Installation['status'];
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
        {INSTALLATION_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}
