import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Modal } from '@/shared/components/Modal';
import { Toolbar } from '@/shared/components/Toolbar';
import { formatRM, formatRMShort } from '@/shared/lib/format';
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
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'pipeline'>('list');
  const [modal, setModal] = useState<Quote | 'new' | null>(null);
  const [pendingChange, setPendingChange] = useState<{ quote: Quote; newStatus: Quote['status'] } | null>(null);

  const confirmStatusChange = () => {
    if (!pendingChange) return;
    updateMut.mutate(
      { id: pendingChange.quote.id, patch: { status: pendingChange.newStatus } },
      { onSuccess: () => setPendingChange(null) }
    );
  };

  const filtered = quotes.filter((q) => {
    if (filterStatus !== 'All' && q.status !== filterStatus) return false;
    if (!search) return true;
    const customer = customerById.get(q.customer_id);
    return `${q.id} ${customer?.name ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });

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
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
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

      {tab === 'list' && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Ref', 'Type', 'Customer', 'Manager', 'Items', 'Total', 'Status', 'Expires'].map((h) => (
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
              {filtered.map((q) => {
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
                    <td style={{ padding: '13px 16px', fontWeight: 600 }}>{customer?.name ?? q.customer_id}</td>
                    <td style={{ padding: '13px 16px', color: C.slate }}>
                      {q.sales_manager_id ? (managerById.get(q.sales_manager_id)?.name ?? q.sales_manager_id) : <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate }}>{q.line_items.length} item(s)</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                      {formatRM(calcQuoteTotal(q.line_items, q.discount))}
                    </td>
                    <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <StatusSelect
                        current={q.status}
                        onChange={(newStatus) => setPendingChange({ quote: q, newStatus })}
                      />
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
        </div>
      )}

      {tab === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {QUOTE_STATUSES.map((status) => {
            const items = quotes.filter((q) => q.status === status);
            const colTotal = items.reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
            return (
              <div
                key={status}
                style={{
                  background: C.white,
                  borderRadius: 16,
                  padding: 14,
                  border: `1px solid ${C.border}`,
                  minHeight: 200,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 4 }}>{status}</div>
                <div style={{ fontSize: 11, color: C.slate, marginBottom: 10 }}>
                  {items.length} · {formatRMShort(colTotal)}
                </div>
                {items.map((q) => {
                  const customer = customerById.get(q.customer_id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => setModal(q)}
                      style={{
                        background: C.seasalt,
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 8,
                        cursor: 'pointer',
                        border: `1px solid ${C.divider}`,
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{q.id}</div>
                      <div style={{ fontSize: 12, marginTop: 2 }}>{customer?.name ?? q.customer_id}</div>
                      <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
                        {q.sales_manager_id ? managerById.get(q.sales_manager_id)?.name : null}
                      </div>
                      <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
                        {formatRM(calcQuoteTotal(q.line_items, q.discount))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <QuoteModal
          quote={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
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
