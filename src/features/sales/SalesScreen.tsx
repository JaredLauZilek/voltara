import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { Toolbar } from '@/shared/components/Toolbar';
import { formatRM, formatRMShort } from '@/shared/lib/format';
import { useCustomers } from '@/features/customers';
import { useQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote } from './hooks';
import { QuoteModal } from './QuoteModal';
import { QUOTE_STATUSES, calcQuoteTotal } from './types';
import type { Quote, QuoteInsert } from './types';

export function SalesScreen() {
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const createMut = useCreateQuote();
  const updateMut = useUpdateQuote();
  const deleteMut = useDeleteQuote();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const [filterStatus, setFilterStatus] = useState<'All' | Quote['status']>('All');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'pipeline'>('list');
  const [modal, setModal] = useState<Quote | 'new' | null>(null);

  const filtered = quotes.filter((q) => {
    if (filterStatus !== 'All' && q.status !== filterStatus) return false;
    if (!search) return true;
    const customer = customerById.get(q.customer_id);
    return `${q.id} ${customer?.name ?? ''}`.toLowerCase().includes(search.toLowerCase());
  });

  const pipelineValue = quotes
    .filter((q) => ['Draft', 'Sent', 'Viewed'].includes(q.status))
    .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
  const acceptedValue = quotes
    .filter((q) => q.status === 'Accepted')
    .reduce((s, q) => s + calcQuoteTotal(q.line_items, q.discount), 0);
  const awaiting = quotes.filter((q) => ['Sent', 'Viewed'].includes(q.status)).length;
  const decided = quotes.filter((q) => ['Accepted', 'Declined'].includes(q.status));
  const winRate =
    decided.length > 0 ? (decided.filter((q) => q.status === 'Accepted').length / decided.length) * 100 : 0;

  const handleSave = (row: QuoteInsert) => {
    if (modal === 'new') createMut.mutate(row, { onSuccess: () => setModal(null) });
    else if (modal && typeof modal !== 'string')
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Pipeline Value" value={formatRMShort(pipelineValue)} sub="Active quotes" accent />
        <KPICard label="Accepted Value" value={formatRMShort(acceptedValue)} sub="Won deals" />
        <KPICard label="Awaiting Response" value={awaiting} sub="Sent + Viewed" />
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
                {['Ref', 'Type', 'Customer', 'Items', 'Total', 'Status', 'Expires'].map((h) => (
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
                    <td style={{ padding: '13px 16px', color: C.slate }}>{q.line_items.length} item(s)</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                      {formatRM(calcQuoteTotal(q.line_items, q.discount))}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <Badge status={q.status} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
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
    </div>
  );
}
