import { useState } from 'react';
import { C, STATUS_COLORS } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { Pagination, usePagination } from '@/shared/components/Pagination';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { formatRM, formatRMShort, todayISO, monthKey } from '@/shared/lib/format';
import { toMYRSnapshot } from '@/shared/lib/fxRate';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseCategories,
  useExpenseEntities,
} from './hooks';
import { ExpenseModal } from './ExpenseModal';
import { EXPENSE_STATUSES } from './types';
import type { Expense, ExpenseInsert, ExpenseStatus } from './types';

type StatusFilter = 'All' | ExpenseStatus;
type Tab = 'one-off' | 'recurring';

const MONTHLY_FACTOR: Record<Expense['recurrence'], number> = {
  None: 0,
  Weekly: 4.33,
  Monthly: 1,
  Quarterly: 1 / 3,
  Yearly: 1 / 12,
};

export function ExpensesScreen() {
  const { data: expenses = [] } = useExpenses();
  const { data: categories = [] } = useExpenseCategories();
  const { data: entities = [] } = useExpenseEntities();
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterEntity, setFilterEntity] = useState<string>('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('one-off');
  const [modal, setModal] = useState<Expense | 'new' | null>(null);

  const hasSecondaryFilters =
    filterCategory !== 'All' || filterEntity !== 'All' || !!filterDateFrom || !!filterDateTo;
  const clearSecondary = () => {
    setFilterCategory('All');
    setFilterEntity('All');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const matchesText = (e: Expense) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      (e.entity?.toLowerCase().includes(q) ?? false) ||
      (e.reference?.toLowerCase().includes(q) ?? false) ||
      (e.notes?.toLowerCase().includes(q) ?? false)
    );
  };

  const matchesBaseFilters = (e: Expense) => {
    if (filterCategory !== 'All' && e.category !== filterCategory) return false;
    if (filterEntity !== 'All' && e.entity !== filterEntity) return false;
    if (filterDateFrom && e.expense_date < filterDateFrom) return false;
    if (filterDateTo && e.expense_date > filterDateTo) return false;
    return matchesText(e);
  };

  // For one-off: status filter applies to the row's top-level status.
  const oneOffMatches = (e: Expense) => {
    if (e.recurrence !== 'None') return false;
    if (!matchesBaseFilters(e)) return false;
    if (filterStatus !== 'All' && e.status !== filterStatus) return false;
    return true;
  };

  // For recurring: status filter applies to "any period matches".
  const recurringMatches = (e: Expense) => {
    if (e.recurrence === 'None') return false;
    if (!matchesBaseFilters(e)) return false;
    if (filterStatus !== 'All') {
      const anyMatch = e.periods.some((p) => p.status === filterStatus);
      if (!anyMatch && e.periods.length > 0) return false;
    }
    return true;
  };

  const oneOff = expenses.filter(oneOffMatches);
  const recurring = expenses.filter(recurringMatches);

  const oneOffPagination = usePagination(oneOff);
  const recurringPagination = usePagination(recurring, 9);

  // KPI: spent this month (Paid one-off in month + Paid periods in month)
  const today = new Date();
  const thisMonth = monthKey(today);
  const yearKey = String(today.getFullYear());

  let spentThisMonth = 0;
  let ytdSpent = 0;
  let pendingCount = 0;

  for (const e of expenses) {
    if (e.recurrence === 'None') {
      // Use the snapshotted FX rate from `expense_date`; falls back to the
      // static MYR_RATES table for legacy rows without a snapshot.
      const amtMYR = toMYRSnapshot(Number(e.amount), e.myr_rate, e.currency);
      if (e.status === 'Pending') pendingCount += 1;
      if (e.status === 'Paid' && e.paid_on?.slice(0, 7) === thisMonth) spentThisMonth += amtMYR;
      if (e.status === 'Paid' && e.paid_on?.slice(0, 4) === yearKey) ytdSpent += amtMYR;
    } else {
      for (const p of e.periods) {
        // Per-period amount override (added for varying subscriptions
        // like Google Workspace). Falls back to the parent's baseline.
        // Currency is parent-level; per-period MYR rate is snapshotted at
        // the period's `paid_on`, falling back to the parent rate then the
        // static table.
        const periodAmount = toMYRSnapshot(Number(p.amount ?? e.amount), p.myr_rate ?? e.myr_rate, e.currency);
        if (p.status === 'Pending') pendingCount += 1;
        if (p.status === 'Paid' && p.period === thisMonth) spentThisMonth += periodAmount;
        if (p.status === 'Paid' && p.period.slice(0, 4) === yearKey) ytdSpent += periodAmount;
      }
    }
  }

  // Recurring monthly burn — normalized + MYR-converted. Uses the parent
  // rate snapshot (the forward-looking projection sits at the parent level;
  // per-period rates only matter for already-paid history).
  const recurringMonthly = expenses
    .filter((e) => e.recurrence !== 'None')
    .reduce((s, e) => s + toMYRSnapshot(Number(e.amount), e.myr_rate, e.currency) * MONTHLY_FACTOR[e.recurrence], 0);

  // Surface to the user that mixed-currency totals are RM-equivalents.
  const hasNonRM = expenses.some((e) => e.currency && e.currency !== 'RM');

  const handleSave = (row: ExpenseInsert) => {
    if (modal === 'new') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      updateMut.mutate({ id: modal.id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  const handleInlineStatusChange = (expense: Expense, status: ExpenseStatus) => {
    if (status === expense.status) return;
    const patch: Partial<Expense> = { status };
    if (status === 'Paid' && !expense.paid_on) patch.paid_on = todayISO();
    if (status !== 'Paid') patch.paid_on = null;
    updateMut.mutate({ id: expense.id, patch });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="YTD Spent" value={formatRMShort(ytdSpent)} sub={`${yearKey} so far${hasNonRM ? ' · RM eq.' : ''}`} accent />
        <KPICard label="Pending" value={pendingCount} sub="Awaiting payment" />
        <KPICard label="Recurring / Month" value={formatRMShort(recurringMonthly)} sub={hasNonRM ? 'Normalized burn · RM eq.' : 'Normalized burn'} />
        <KPICard label="Spent This Month" value={formatRMShort(spentThisMonth)} sub={hasNonRM ? 'Paid · RM eq.' : 'Paid expenses'} />
      </div>

      <Toolbar
        filters={['All', ...EXPENSE_STATUSES]}
        filter={filterStatus}
        onFilterChange={(f) => setFilterStatus(f as StatusFilter)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ref / entity / notes…"
        primaryLabel="+ New Expense"
        onPrimary={() => setModal('new')}
        extra={
          <div style={{ display: 'flex', gap: 4, background: C.divider, borderRadius: 99, padding: 3 }}>
            {(['one-off', 'recurring'] as const).map((t) => (
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
                  whiteSpace: 'nowrap',
                }}
              >
                {t === 'one-off' ? 'One-off' : 'Recurring'}
              </button>
            ))}
          </div>
        }
      />

      {/* Secondary filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Category</span>
          <div style={{ width: 180 }}>
            <SearchableSelect
              options={categories.map((c) => ({ value: c, label: c }))}
              value={filterCategory === 'All' ? null : filterCategory}
              onChange={(v) => setFilterCategory(v ?? 'All')}
              nullable
              nullLabel="All"
              placeholder="All"
              style={filterPickerStyle(filterCategory !== 'All')}
            />
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: C.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Entity</span>
          <div style={{ width: 220 }}>
            <SearchableSelect
              options={entities.map((n) => ({ value: n, label: n }))}
              value={filterEntity === 'All' ? null : filterEntity}
              onChange={(v) => setFilterEntity(v ?? 'All')}
              nullable
              nullLabel="All"
              placeholder="All"
              style={filterPickerStyle(filterEntity !== 'All')}
            />
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: C.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Date</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={dateStyle(!!filterDateFrom)}
          />
          <span style={{ fontSize: 12, color: C.slate }}>to</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={dateStyle(!!filterDateTo)}
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

      {/* Recurring cards */}
      {tab === 'recurring' && (
        recurring.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 13, background: C.white, borderRadius: 16, border: `1px solid ${C.border}` }}>
            {expenses.filter((e) => e.recurrence !== 'None').length === 0
              ? <>No recurring expenses yet. Click <strong>+ New Expense</strong> and toggle <strong>recurring</strong>.</>
              : 'No recurring expenses match the filter.'}
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {recurringPagination.pageItems.map((e) => (
                <RecurringCard key={e.id} expense={e} onClick={() => setModal(e)} />
              ))}
            </div>
            <Pagination
              page={recurringPagination.page}
              totalPages={recurringPagination.totalPages}
              totalItems={recurringPagination.totalItems}
              pageSize={recurringPagination.pageSize}
              from={recurringPagination.from}
              to={recurringPagination.to}
              onPageChange={recurringPagination.setPage}
              bordered={false}
            />
          </div>
        )
      )}

      {/* One-off table */}
      {tab === 'one-off' && (
        <div>
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.seasalt }}>
                  {['Ref', 'Date', 'Category', 'Entity', 'Amount', 'Status', 'Files'].map((h) => (
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
                {oneOffPagination.pageItems.map((e) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                    onClick={() => setModal(e)}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = C.hoverRow)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{e.id}</td>
                    <td style={{ padding: '13px 16px', color: C.slate }}>{e.expense_date}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: C.honeydew, color: C.green, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 600 }}>{e.entity ?? <span style={{ fontStyle: 'italic', color: C.slate }}>—</span>}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                      {e.currency} {Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '13px 16px' }} onClick={(ev) => ev.stopPropagation()}>
                      <StatusSelect current={e.status} onChange={(s) => handleInlineStatusChange(e, s)} />
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>
                      {e.attachments.length > 0 ? `${e.attachments.length} 📎` : <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {oneOff.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
                {expenses.filter((e) => e.recurrence === 'None').length === 0
                  ? <>No one-off expenses recorded. Click <strong>+ New Expense</strong> to add one.</>
                  : 'No expenses match the filter.'}
              </div>
            )}
            <Pagination
              page={oneOffPagination.page}
              totalPages={oneOffPagination.totalPages}
              totalItems={oneOffPagination.totalItems}
              pageSize={oneOffPagination.pageSize}
              from={oneOffPagination.from}
              to={oneOffPagination.to}
              onPageChange={oneOffPagination.setPage}
            />
          </div>
        </div>
      )}

      {modal && (
        <ExpenseModal
          expense={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id, attachments) => deleteMut.mutate({ id, attachments }, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}

function RecurringCard({ expense, onClick }: { expense: Expense; onClick: () => void }) {
  const periods = expense.periods ?? [];
  const paid = periods.filter((p) => p.status === 'Paid').length;
  const pending = periods.filter((p) => p.status === 'Pending').length;
  // Native-currency sum of paid periods (shown in the parent's currency).
  // For mixed-currency KPIs the top-of-screen totals convert to MYR; here we
  // stay in-currency so the user can sanity-check against the actual invoice.
  const totalPaidNative = periods
    .filter((p) => p.status === 'Paid')
    .reduce((s, p) => s + Number(p.amount ?? expense.amount), 0);
  const isNonRM = expense.currency && expense.currency !== 'RM';
  // Per-period rate snapshots — each Paid period contributes using its own
  // historical rate, so the MYR equivalent matches what the accountant sees.
  const totalPaidMYR = periods
    .filter((p) => p.status === 'Paid')
    .reduce(
      (s, p) =>
        s +
        toMYRSnapshot(
          Number(p.amount ?? expense.amount),
          p.myr_rate ?? expense.myr_rate,
          expense.currency,
        ),
      0,
    );
  const lastPaid = [...periods]
    .filter((p) => p.status === 'Paid')
    .sort((a, b) => b.period.localeCompare(a.period))[0];
  const palette = STATUS_COLORS.Pending;

  return (
    <div
      onClick={onClick}
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: 18,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        transition: 'box-shadow 150ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{expense.id}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {expense.entity ?? <span style={{ fontStyle: 'italic', color: C.slate, fontWeight: 500 }}>No entity</span>}
          </div>
        </div>
        <span
          style={{
            background: C.honeydew,
            color: C.green,
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: 99,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          {expense.recurrence}
        </span>
      </div>

      <div style={{ fontSize: 12, color: C.slate }}>
        {expense.category}
      </div>

      <div style={{ fontSize: 18, fontWeight: 800, color: C.green, letterSpacing: '-0.02em' }}>
        {expense.currency} {Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span style={{ fontSize: 11, fontWeight: 600, color: C.slate, marginLeft: 4 }}>
          / {expense.recurrence.toLowerCase().replace('ly', '')}
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${C.divider}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: C.slate }}>Periods</span>
          <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{periods.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {paid > 0 && (
            <span style={{ background: STATUS_COLORS.Paid.bg, color: STATUS_COLORS.Paid.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
              {paid} Paid
            </span>
          )}
          {pending > 0 && (
            <span style={{ background: palette.bg, color: palette.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
              {pending} Pending
            </span>
          )}
          {periods.length === 0 && (
            <span style={{ fontSize: 11, color: C.slate, fontStyle: 'italic' }}>No periods recorded</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
          <span style={{ color: C.slate }}>Total paid</span>
          <span style={{ fontWeight: 700, color: C.green, textAlign: 'right' }}>
            {expense.currency} {totalPaidNative.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {isNonRM && (
              <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: C.slate, marginTop: 1 }}>
                ≈ {formatRM(totalPaidMYR, 2)}
              </span>
            )}
          </span>
        </div>
        {lastPaid && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.slate }}>
            <span>Last paid</span>
            <span>{formatPeriodShort(lastPaid.period)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPeriodShort(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' });
}

// Overrides applied to the shared SearchableSelect's trigger so it picks up
// the active-filter "chip" look (green border + honeydew bg) when a value is
// selected — same affordance the date inputs use just below.
function filterPickerStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 28px 7px 12px',
    border: `1px solid ${active ? C.green : C.border}`,
    color: active ? C.green : C.slate,
    fontWeight: active ? 700 : 500,
    background: active ? C.honeydew : C.white,
  };
}

function dateStyle(active: boolean): React.CSSProperties {
  return {
    padding: '7px 10px',
    borderRadius: 10,
    border: `1px solid ${active ? C.green : C.border}`,
    fontFamily: 'Figtree',
    fontSize: 13,
    color: active ? C.green : C.slate,
    background: active ? C.honeydew : C.white,
    outline: 'none',
  };
}

function StatusSelect({ current, onChange }: { current: ExpenseStatus; onChange: (s: ExpenseStatus) => void }) {
  const palette = STATUS_COLORS[current] ?? { bg: C.divider, color: C.slate };
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value as ExpenseStatus;
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
        {EXPENSE_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 9, pointerEvents: 'none', fontSize: 7, color: palette.color, lineHeight: 1 }}>▼</span>
    </div>
  );
}
