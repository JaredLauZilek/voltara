import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Modal } from '@/shared/components/Modal';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { formatRM, formatRMShort, todayISO } from '@/shared/lib/format';
import { useCustomers } from '@/features/customers';
import { useProducts } from '@/features/products';
import { useSalesManagers } from '@/features/sales-managers';
import { useQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote, useAutoExpireQuotes } from './hooks';
import { QuoteModal } from './QuoteModal';
import { QUOTE_STATUSES, calcQuoteTotal } from './types';
import type { Quote, QuoteInsert } from './types';

export function SalesScreen() {
  useAutoExpireQuotes();
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const createMut = useCreateQuote();
  const updateMut = useUpdateQuote();
  const deleteMut = useDeleteQuote();
  const { data: products = [] } = useProducts();
  const { data: salesManagers = [] } = useSalesManagers();
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const managerById = new Map(salesManagers.map((m) => [m.id, m]));

  const [filterStatus, setFilterStatus] = useState<'All' | Quote['status']>('All');
  const [filterManager, setFilterManager] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'pipeline'>('list');
  const [modal, setModal] = useState<Quote | 'new' | null>(null);
  const [pendingChange, setPendingChange] = useState<{ quote: Quote; newStatus: Quote['status'] } | null>(null);

  // Always resolve the modal's quote against the latest query data so the
  // modal (and the print preview) reflect freshly-saved values.
  const modalQuote =
    modal && modal !== 'new' ? (quotes.find((q) => q.id === modal.id) ?? modal) : null;
  const [dragOverStatus, setDragOverStatus] = useState<Quote['status'] | null>(null);
  const [overflowStatus, setOverflowStatus] = useState<Quote['status'] | null>(null);

  const hasSecondaryFilters = !!filterManager || !!filterDateFrom || !!filterDateTo;
  const clearSecondary = () => { setFilterManager(''); setFilterDateFrom(''); setFilterDateTo(''); };

  const confirmStatusChange = () => {
    if (!pendingChange) return;
    updateMut.mutate(
      { id: pendingChange.quote.id, patch: { status: pendingChange.newStatus } },
      { onSuccess: () => setPendingChange(null) }
    );
  };

  const filtered = quotes.filter((q) => {
    if (filterStatus !== 'All' && q.status !== filterStatus) return false;
    if (filterManager && q.sales_manager_id !== filterManager) return false;
    if (filterDateFrom && q.valid_from < filterDateFrom) return false;
    if (filterDateTo && q.valid_from > filterDateTo) return false;
    if (!search) return true;
    const customer = customerById.get(q.customer_id);
    return `${q.id} ${customer?.name ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });

  const pagination = usePagination(filtered);

  const pipelineValue = quotes
    .filter((q) => ['Draft', 'Sent'].includes(q.status))
    .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
  const wonValue = quotes
    .filter((q) => q.status === 'Case Won')
    .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
  const awaiting = quotes.filter((q) => q.status === 'Sent').length;
  const decided = quotes.filter((q) => ['Case Won', 'Case Lost', 'Expired'].includes(q.status));
  const winRate =
    decided.length > 0 ? (decided.filter((q) => q.status === 'Case Won').length / decided.length) * 100 : 0;

  const handleSave = (row: QuoteInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      // Keep the modal open after saving an existing quote so the user can
      // immediately print the PDF if they want.
      updateMut.mutate({ id: modal.id, patch: row });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Pipeline Value" value={formatRMShort(pipelineValue)} sub="Active quotes" accent />
        <KPICard label="Cases Won" value={formatRMShort(wonValue)} sub="Won deals" />
        <KPICard label="Awaiting Response" value={awaiting} sub="Sent, pending reply" />
        <KPICard label="Win Rate" value={`${winRate.toFixed(0)}%`} sub="Accepted / decided" />
      </div>

      <Toolbar
        filters={['All', ...QUOTE_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as typeof filterStatus)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search quotes / customers…"
        primaryLabel="+ New Quote"
        onPrimary={() => setModal('new')}
        extra={
          <div style={{ display: 'flex', gap: 4, background: C.divider, borderRadius: 99, padding: 3 }}>
            {(['list', 'pipeline'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: 'none',
                  background: tab === t ? C.white : 'transparent',
                  color: tab === t ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      {/* Secondary filters: manager + date range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Manager</span>
          <select
            value={filterManager}
            onChange={(e) => setFilterManager(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: `1px solid ${filterManager ? C.green : C.border}`,
              fontFamily: 'Figtree',
              fontSize: 13,
              color: filterManager ? C.green : C.slate,
              fontWeight: filterManager ? 700 : 500,
              background: filterManager ? C.honeydew : C.white,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">All managers</option>
            {salesManagers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: C.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Valid From</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: `1px solid ${filterDateFrom ? C.green : C.border}`,
              fontFamily: 'Figtree',
              fontSize: 13,
              color: filterDateFrom ? C.green : C.slate,
              background: filterDateFrom ? C.honeydew : C.white,
              outline: 'none',
            }}
          />
          <span style={{ fontSize: 12, color: C.slate }}>to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              border: `1px solid ${filterDateTo ? C.green : C.border}`,
              fontFamily: 'Figtree',
              fontSize: 13,
              color: filterDateTo ? C.green : C.slate,
              background: filterDateTo ? C.honeydew : C.white,
              outline: 'none',
            }}
          />
        </div>

        {hasSecondaryFilters && (
          <button
            onClick={clearSecondary}
            style={{ padding: '7px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {tab === 'list' && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Ref', 'Type', 'Customer', 'Manager', 'Total', 'Status', 'Days Idle', 'Last Follow-up', 'Expires'].map((h) => (
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
              {pagination.pageItems.map((q) => {
                const customer = customerById.get(q.customer_id);
                return (
                  <tr
                    key={q.id}
                    style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                    onClick={() => setModal(q)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{q.id}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: q.type === 'Proposal' ? C.honeydew : C.divider,
                          color: q.type === 'Proposal' ? C.green : C.slate,
                        }}
                      >
                        {q.type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{customer?.name ?? q.customer_id}</div>
                      {customer && (
                        <div style={{ marginTop: 3 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 6,
                            letterSpacing: '0.04em',
                            background: customer.type === 'Residential' ? C.divider : C.honeydew,
                            color: customer.type === 'Residential' ? C.slate : C.green,
                          }}>
                            {customer.type}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate }}>
                      {q.sales_manager_id ? (managerById.get(q.sales_manager_id)?.name ?? q.sales_manager_id) : <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                      {formatRM(calcQuoteTotal(q.line_items, q.discount))}
                    </td>
                    <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <StatusSelect
                        current={q.status}
                        onChange={(newStatus) => setPendingChange({ quote: q, newStatus })}
                      />
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate }}>
                      {q.status === 'Sent'
                        ? formatIdleDays(q.last_followup_date ?? q.valid_from)
                        : <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => updateMut.mutate({ id: q.id, patch: { last_followup_date: todayISO() } })}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: `1px solid ${q.last_followup_date ? C.border : C.green}`,
                          background: q.last_followup_date ? 'transparent' : C.honeydew,
                          color: q.last_followup_date ? C.slate : C.green,
                          fontFamily: 'Figtree',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {q.last_followup_date ?? 'Log follow-up'}
                      </button>
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate }}>{q.valid_to}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No quotes found.</div>
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
      )}

      {tab === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {QUOTE_STATUSES.map((status) => {
            const items = filtered.filter((q) => q.status === status);
            const colTotal = items.reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
            const isOver = dragOverStatus === status;
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverStatus(status); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStatus(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStatus(null);
                  const quoteId = e.dataTransfer.getData('quoteId');
                  const quote = quotes.find((q) => q.id === quoteId);
                  if (quote && quote.status !== status) setPendingChange({ quote, newStatus: status });
                }}
                style={{
                  background: isOver ? C.honeydew : C.white,
                  borderRadius: 16,
                  padding: 14,
                  border: `2px solid ${isOver ? C.green : C.border}`,
                  minHeight: 200,
                  transition: 'background 100ms, border-color 100ms',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 4 }}>{status}</div>
                <div style={{ fontSize: 11, color: C.slate, marginBottom: 10 }}>
                  {items.length} · {formatRMShort(colTotal)}
                </div>
                {items.slice(0, 3).map((q) => (
                  <PipelineCard
                    key={q.id}
                    quote={q}
                    customer={customerById.get(q.customer_id)}
                    manager={q.sales_manager_id ? managerById.get(q.sales_manager_id) : undefined}
                    onDragStart={() => {}}
                    onDragEnd={() => setDragOverStatus(null)}
                    onClick={() => setModal(q)}
                  />
                ))}
                {items.length > 3 && (
                  <button
                    onClick={() => setOverflowStatus(status)}
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      borderRadius: 8,
                      border: `1px dashed ${C.border}`,
                      background: 'transparent',
                      color: C.slate,
                      fontFamily: 'Figtree',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +{items.length - 3} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {overflowStatus && (() => {
        const allItems = filtered.filter((q) => q.status === overflowStatus);
        return (
          <Modal
            title={overflowStatus}
            subtitle={`${allItems.length} quotes`}
            onClose={() => setOverflowStatus(null)}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
              {allItems.map((q) => {
                const customer = customerById.get(q.customer_id);
                const manager = q.sales_manager_id ? managerById.get(q.sales_manager_id) : undefined;
                return (
                  <div
                    key={q.id}
                    onClick={() => { setOverflowStatus(null); setModal(q); }}
                    style={{
                      background: C.seasalt,
                      borderRadius: 10,
                      padding: 12,
                      cursor: 'pointer',
                      border: `1px solid ${C.divider}`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.hoverRow)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.seasalt)}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{q.id}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{customer?.name ?? q.customer_id}</div>
                    {manager && <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{manager.name}</div>}
                    <div style={{ fontSize: 12, color: C.green, fontWeight: 700, marginTop: 6 }}>
                      {formatRM(calcQuoteTotal(q.line_items, q.discount))}
                    </div>
                    <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>Expires {q.valid_to}</div>
                  </div>
                );
              })}
            </div>
          </Modal>
        );
      })()}

      {modal && (
        <QuoteModal
          quote={modal === 'new' ? null : modalQuote}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
          onDelete={(id, poAttachments, proposalAttachments) =>
            deleteMut.mutate({ id, poAttachments, proposalAttachments }, { onSuccess: () => setModal(null) })
          }
        />
      )}

      {pendingChange && (() => {
        const isDeducting = pendingChange.newStatus === 'Case Won';
        const isRestoring = pendingChange.quote.status === 'Case Won' && !isDeducting;
        const showItems = isDeducting || isRestoring;
        const accentBg  = isDeducting ? C.honeydew : '#FFF8E1';
        const accentText = isDeducting ? C.green : '#B07D00';
        const accentLabel = isDeducting
          ? 'The following items will be deducted from inventory:'
          : 'The following items will be restored to inventory:';
        return (
          <Modal title="Confirm status change" onClose={() => setPendingChange(null)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.5 }}>
                Change{' '}
                <span style={{ fontWeight: 700, color: C.green }}>{pendingChange.quote.id}</span>
                {' '}from{' '}
                <StatusPill status={pendingChange.quote.status} />
                {' '}to{' '}
                <StatusPill status={pendingChange.newStatus} />?
              </div>

              {showItems && (
                <div style={{ background: accentBg, borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: accentText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {accentLabel}
                  </div>
                  <div style={{ background: C.white, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: C.seasalt }}>
                          {['Product', 'SKU', 'Qty'].map((h) => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.border}` }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendingChange.quote.line_items.map((li, i) => {
                          const product = productById.get(li.product_id);
                          return (
                            <tr key={i} style={{ borderBottom: `1px solid ${C.divider}` }}>
                              <td style={{ padding: '9px 12px', fontWeight: 600, color: '#1a1a1a' }}>
                                {product?.name ?? li.product_id}
                              </td>
                              <td style={{ padding: '9px 12px', color: C.slate, fontSize: 12 }}>
                                {li.product_id}
                              </td>
                              <td style={{ padding: '9px 12px', fontWeight: 700, color: accentText }}>
                                {isDeducting ? '−' : '+'}{li.qty}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setPendingChange(null)}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusChange}
                  disabled={updateMut.isPending}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {updateMut.isPending ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

function formatIdleDays(sinceISO: string): React.ReactNode {
  const days = Math.floor((Date.now() - new Date(sinceISO).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  const isStale = days > 7;
  return (
    <span style={{ color: isStale ? '#C0321A' : C.slate, fontWeight: isStale ? 700 : 500 }}>
      {days} {days === 1 ? 'day' : 'days'}
    </span>
  );
}

function StatusSelect({ current, onChange }: { current: Quote['status']; onChange: (s: Quote['status']) => void }) {
  const palette = STATUS_COLORS[current] ?? { bg: C.divider, color: C.slate };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as Quote['status'];
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
        {QUOTE_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const palette = STATUS_COLORS[status] ?? { bg: C.divider, color: C.slate };
  return (
    <span style={{ display: 'inline-block', background: palette.bg, color: palette.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
      {status}
    </span>
  );
}

function PipelineCard({
  quote,
  customer,
  manager,
  onDragEnd,
  onClick,
}: {
  quote: Quote;
  customer: { name: string } | undefined;
  manager: { name: string } | undefined;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('quoteId', quote.id);
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).style.opacity = '0.45';
      }}
      onDragEnd={(e) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        onDragEnd();
      }}
      onClick={onClick}
      style={{
        background: C.seasalt,
        borderRadius: 8,
        padding: 10,
        marginBottom: 8,
        cursor: 'grab',
        border: `1px solid ${C.divider}`,
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{quote.id}</div>
      <div style={{ fontSize: 12, marginTop: 2 }}>{customer?.name ?? quote.customer_id}</div>
      {manager && <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{manager.name}</div>}
      <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
        {formatRM(calcQuoteTotal(quote.line_items, quote.discount))}
      </div>
    </div>
  );
}
