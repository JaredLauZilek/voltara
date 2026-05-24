import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Badge } from '@/shared/components/Badge';
import { formatRM, formatDate, todayISO } from '@/shared/lib/format';

import { useCustomers } from '@/features/customers';
import { useSuppliers } from '@/features/suppliers';
import { useInstallations } from '@/features/installations';
import { useInvoices, calcInvoiceTotals } from '@/features/invoices';
import { useBills } from '@/features/bills';
import { useExpenses } from '@/features/expenses';
import { useQuotes, calcQuoteTotal } from '@/features/sales';

import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from './hooks';
import { TaskModal } from './TaskModal';
import type { Task, TaskInsert } from './types';

const SECTION_CARD: React.CSSProperties = {
  background: C.white,
  borderRadius: 16,
  border: `1px solid ${C.border}`,
  overflow: 'hidden',
};

const SECTION_HEADER: React.CSSProperties = {
  padding: '14px 20px',
  borderBottom: `1px solid ${C.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: C.green,
};

const SECTION_COUNT: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const ROW: React.CSSProperties = {
  display: 'grid',
  alignItems: 'center',
  gap: 12,
  padding: '12px 20px',
  borderBottom: `1px solid ${C.divider}`,
  fontSize: 13,
};

const EMPTY: React.CSSProperties = {
  padding: 32,
  textAlign: 'center',
  color: C.slate,
  fontSize: 13,
};

const daysBetween = (iso: string, todayIso: string): number => {
  const a = new Date(iso).getTime();
  const b = new Date(todayIso).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
};

// Quotes are "needing follow-up" when status is Sent and the last touch was
// at least 3 days ago. Mirrors the sales-table convention (§18) of measuring
// idleness from `last_followup_date ?? valid_from`.
const FOLLOWUP_IDLE_THRESHOLD_DAYS = 3;

export function TodoScreen() {
  const today = todayISO();

  const { data: tasks = [] } = useTasks();
  const { data: installations = [] } = useInstallations();
  const { data: invoices = [] } = useInvoices();
  const { data: bills = [] } = useBills();
  const { data: expenses = [] } = useExpenses();
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const deleteMut = useDeleteTask();

  const [modal, setModal] = useState<Task | 'new' | null>(null);
  // Reset modal-mutation errors when the modal switches rows (per §11).
  useMemo(() => {
    createMut.reset();
    updateMut.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  const modalTask = modal && modal !== 'new' ? (tasks.find((t) => t.id === modal.id) ?? modal) : null;

  // ── Derived buckets ──────────────────────────────────────────────────────
  const pendingInstallations = installations.filter(
    (i) => i.status === 'Pending' || i.status === 'In Progress' || i.status === 'Overdue'
  );

  const outstandingInvoices = invoices.filter(
    (i) => i.status === 'Sent' || i.status === 'Partially Paid' || i.status === 'Overdue'
  );

  const unpaidBills = bills.filter(
    (b) => b.status === 'Unpaid' || b.status === 'Overdue' || b.status === 'Disputed'
  );

  const pendingExpenses = expenses.filter((e) => e.status === 'Pending');

  const followupQuotes = quotes
    .filter((q) => q.status === 'Sent')
    .filter((q) => {
      const lastTouch = q.last_followup_date ?? q.valid_from;
      return daysBetween(lastTouch, today) >= FOLLOWUP_IDLE_THRESHOLD_DAYS;
    });

  // Bills + expenses are multi-currency — counting is honest, summing isn't.
  // KPI shows count only, with sub-line listing the currency mix.
  const billCurrencyMix = Array.from(new Set(unpaidBills.map((b) => b.currency))).join(' · ');
  const expCurrencyMix = Array.from(new Set(pendingExpenses.map((e) => e.currency))).join(' · ');

  const outstandingInvoicesTotal = outstandingInvoices.reduce(
    (sum, inv) => sum + calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode).total,
    0
  );

  // ── User tasks (table) ───────────────────────────────────────────────────
  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);
  const [showDone, setShowDone] = useState(false);
  // Per-column pagination — each priority lane scrolls independently.
  // Page size matches the visible 5×2 grid (§ "up to 5Rx2C cards in view").
  const [pages, setPages] = useState<Record<'High' | 'Normal' | 'Low', number>>({ High: 0, Normal: 0, Low: 0 });
  // Native HTML5 DnD: the id being dragged and the lane currently dragover'd.
  // Keeping it in state so the receiving lane can render a highlight.
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'High' | 'Normal' | 'Low' | null>(null);

  const handleDropOnLane = (toPriority: 'High' | 'Normal' | 'Low') => {
    if (!draggedId) return;
    const task = tasks.find((t) => t.id === draggedId);
    setDraggedId(null);
    setDragOver(null);
    if (!task || task.priority === toPriority) return;
    updateMut.mutate({ id: draggedId, patch: { priority: toPriority } });
  };

  const handleSave = (row: TaskInsert) => {
    if (modal === 'new') {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (modal && typeof modal !== 'string') {
      // Edit-save: per §11, keep the modal open. The done toggle inside the
      // modal is enough feedback.
      updateMut.mutate({ id: modal.id, patch: row });
    }
  };

  const toggleDone = (t: Task) => {
    const next = !t.done;
    updateMut.mutate({
      id: t.id,
      patch: { done: next, done_at: next ? new Date().toISOString() : null },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard
          label="Open Tasks"
          value={openTasks.length}
          sub={`${doneTasks.length} done`}
          accent
        />
        <KPICard
          label="Pending Installations"
          value={pendingInstallations.length}
          sub="Pending · In Progress · Overdue"
        />
        <KPICard
          label="Outstanding Invoices"
          value={outstandingInvoices.length}
          sub={outstandingInvoicesTotal > 0 ? formatRM(outstandingInvoicesTotal) : 'No outstanding amount'}
        />
        <KPICard
          label="Quotes To Follow Up"
          value={followupQuotes.length}
          sub={`Sent ≥ ${FOLLOWUP_IDLE_THRESHOLD_DAYS} days ago`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        <KPICard
          label="Unpaid Bills"
          value={unpaidBills.length}
          sub={unpaidBills.length > 0 ? `Currencies: ${billCurrencyMix}` : 'All settled'}
        />
        <KPICard
          label="Pending Expenses"
          value={pendingExpenses.length}
          sub={pendingExpenses.length > 0 ? `Currencies: ${expCurrencyMix}` : 'All settled'}
        />
      </div>

      {/* User tasks */}
      <div style={SECTION_CARD}>
        <div style={SECTION_HEADER}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={SECTION_TITLE}>My Tasks</span>
            <span style={SECTION_COUNT}>{openTasks.length} open</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {doneTasks.length > 0 && (
              <button
                onClick={() => setShowDone((v) => !v)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 99,
                  border: `1px solid ${C.border}`,
                  background: showDone ? C.honeydew : C.white,
                  color: showDone ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showDone ? `Hide done (${doneTasks.length})` : `Show done (${doneTasks.length})`}
              </button>
            )}
            <button
              onClick={() => setModal('new')}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                background: C.green,
                color: C.white,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + New Task
            </button>
          </div>
        </div>

        {openTasks.length === 0 && !showDone && (
          <div style={EMPTY}>No open tasks. Click <strong>+ New Task</strong> to add one.</div>
        )}

        {(openTasks.length > 0 || (showDone && doneTasks.length > 0)) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: 20, background: C.seasalt }}>
            {(['High', 'Normal', 'Low'] as const).map((p) => {
              const colTasks = [
                ...openTasks.filter((t) => t.priority === p),
                ...(showDone ? doneTasks.filter((t) => t.priority === p) : []),
              ];
              return (
                <KanbanColumn
                  key={p}
                  priority={p}
                  tasks={colTasks}
                  today={today}
                  page={pages[p]}
                  onPageChange={(next) => setPages((prev) => ({ ...prev, [p]: next }))}
                  draggedId={draggedId}
                  isDragOver={dragOver === p}
                  onDragStart={(id) => setDraggedId(id)}
                  onDragEnd={() => { setDraggedId(null); setDragOver(null); }}
                  onDragEnter={() => setDragOver(p)}
                  onDragLeaveLane={() => setDragOver((cur) => (cur === p ? null : cur))}
                  onDrop={() => handleDropOnLane(p)}
                  onOpen={(t) => setModal(t)}
                  onToggle={(t) => toggleDone(t)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Pending installations */}
      <Section
        title="Pending Installations"
        count={pendingInstallations.length}
        countLabel="open"
        empty="Nothing scheduled — all caught up."
      >
        {pendingInstallations.map((i) => {
          const customer = customerById.get(i.customer_id);
          const overdue = i.scheduled && daysBetween(i.scheduled, today) > 0 && i.status !== 'Completed';
          return (
            <div key={i.id} style={{ ...ROW, gridTemplateColumns: '110px 1fr 140px 1fr 110px' }}>
              <div style={{ fontWeight: 700, color: C.green }}>{i.id}</div>
              <div style={{ fontWeight: 600 }}>{customer?.name ?? i.customer_id}</div>
              <div style={{ color: overdue ? C.error : C.slate, fontWeight: overdue ? 700 : 500 }}>
                {formatDate(i.scheduled)}
                {i.scheduled_time ? ` · ${i.scheduled_time.slice(0, 5)}` : ''}
              </div>
              <div style={{ color: C.slate }}>{i.tech || <em>— no contractor —</em>}</div>
              <div><Badge status={i.status} /></div>
            </div>
          );
        })}
      </Section>

      {/* Outstanding invoices */}
      <Section
        title="Outstanding Invoices"
        count={outstandingInvoices.length}
        countLabel="open"
        empty="No outstanding invoices."
      >
        {outstandingInvoices.map((inv) => {
          const customer = customerById.get(inv.customer_id);
          const totals = calcInvoiceTotals(inv.line_items, inv.discount, inv.tax, inv.discount_mode);
          const overdue = inv.due_date && daysBetween(inv.due_date, today) > 0 && inv.status !== 'Paid';
          return (
            <div key={inv.id} style={{ ...ROW, gridTemplateColumns: '110px 1fr 140px 140px 130px' }}>
              <div style={{ fontWeight: 700, color: C.green }}>{inv.id}</div>
              <div style={{ fontWeight: 600 }}>{customer?.name ?? inv.customer_id}</div>
              <div style={{ fontWeight: 700 }}>{formatRM(totals.total)}</div>
              <div style={{ color: overdue ? C.error : C.slate, fontWeight: overdue ? 700 : 500 }}>
                Due {formatDate(inv.due_date)}
              </div>
              <div><Badge status={inv.status} /></div>
            </div>
          );
        })}
      </Section>

      {/* Unpaid bills */}
      <Section
        title="Unpaid Bills"
        count={unpaidBills.length}
        countLabel="open"
        empty="No unpaid bills."
      >
        {unpaidBills.map((b) => {
          const supplier = supplierById.get(b.supplier_id);
          const overdue = b.due_date && daysBetween(b.due_date, today) > 0 && b.status !== 'Paid';
          const total = (b.amount ?? 0) + (b.tax ?? 0);
          return (
            <div key={b.id} style={{ ...ROW, gridTemplateColumns: '110px 1fr 160px 140px 110px' }}>
              <div style={{ fontWeight: 700, color: C.green }}>{b.id}</div>
              <div style={{ fontWeight: 600 }}>{supplier?.name ?? b.supplier_id}</div>
              <div style={{ fontWeight: 700 }}>
                {b.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ color: overdue ? C.error : C.slate, fontWeight: overdue ? 700 : 500 }}>
                {b.due_date ? `Due ${formatDate(b.due_date)}` : 'No due date'}
              </div>
              <div><Badge status={b.status} /></div>
            </div>
          );
        })}
      </Section>

      {/* Pending expenses */}
      <Section
        title="Pending Expenses"
        count={pendingExpenses.length}
        countLabel="open"
        empty="No pending expenses."
      >
        {pendingExpenses.map((e) => {
          const supplier = e.supplier_id ? supplierById.get(e.supplier_id) : null;
          const payee = supplier?.name ?? e.payee ?? '—';
          return (
            <div key={e.id} style={{ ...ROW, gridTemplateColumns: '110px 1fr 160px 140px 110px' }}>
              <div style={{ fontWeight: 700, color: C.green }}>{e.id}</div>
              <div style={{ fontWeight: 600 }}>{payee}</div>
              <div style={{ fontWeight: 700 }}>
                {e.currency} {Number(e.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ color: C.slate }}>{formatDate(e.expense_date)}</div>
              <div><Badge status={e.status} /></div>
            </div>
          );
        })}
      </Section>

      {/* Quotes to follow up */}
      <Section
        title="Quotes To Follow Up"
        count={followupQuotes.length}
        countLabel="open"
        empty="No quotes need a follow-up."
      >
        {followupQuotes.map((q) => {
          const customer = customerById.get(q.customer_id);
          const lastTouch = q.last_followup_date ?? q.valid_from;
          const daysIdle = daysBetween(lastTouch, today);
          const total = calcQuoteTotal(q.line_items, q.discount);
          return (
            <div key={q.id} style={{ ...ROW, gridTemplateColumns: '120px 1fr 160px 140px 110px' }}>
              <div style={{ fontWeight: 700, color: C.green }}>{q.id}</div>
              <div style={{ fontWeight: 600 }}>{customer?.name ?? q.customer_id}</div>
              <div style={{ fontWeight: 700 }}>{formatRM(total)}</div>
              <div style={{ color: daysIdle > 7 ? C.error : C.slate, fontWeight: daysIdle > 7 ? 700 : 500 }}>
                Idle {daysIdle} day{daysIdle === 1 ? '' : 's'}
              </div>
              <div><Badge status={q.status} /></div>
            </div>
          );
        })}
      </Section>

      {modal && (
        <TaskModal
          task={modal === 'new' ? null : modalTask}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={createMut.isPending || updateMut.isPending}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}

function Section({
  title,
  count,
  countLabel,
  empty,
  children,
}: {
  title: string;
  count: number;
  countLabel: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div style={SECTION_CARD}>
      <div style={SECTION_HEADER}>
        <span style={SECTION_TITLE}>{title}</span>
        <span style={SECTION_COUNT}>{count} {countLabel}</span>
      </div>
      {count === 0 ? <div style={EMPTY}>{empty}</div> : children}
    </div>
  );
}

// Priority → column accent. Headers use the strong tone, cards use the soft bg.
const PRIORITY_THEME: Record<'High' | 'Normal' | 'Low', { strong: string; soft: string; ink: string }> = {
  High:   { strong: C.error, soft: C.errorBg,   ink: C.error },
  Normal: { strong: C.green, soft: C.honeydew,  ink: C.green },
  Low:    { strong: C.slate, soft: C.divider,   ink: C.slate },
};

// 5 rows × 2 cols = one full kanban "page" per priority lane.
const PAGE_SIZE = 10;

function KanbanColumn({
  priority,
  tasks,
  today,
  page,
  onPageChange,
  draggedId,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeaveLane,
  onDrop,
  onOpen,
  onToggle,
}: {
  priority: 'High' | 'Normal' | 'Low';
  tasks: Task[];
  today: string;
  page: number;
  onPageChange: (next: number) => void;
  draggedId: string | null;
  isDragOver: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDragLeaveLane: () => void;
  onDrop: () => void;
  onOpen: (t: Task) => void;
  onToggle: (t: Task) => void;
}) {
  const theme = PRIORITY_THEME[priority];
  const openCount = tasks.filter((t) => !t.done).length;
  const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
  // Clamp page in case tasks shrunk under the user (mark-done / drag-out).
  const safePage = Math.min(page, totalPages - 1);
  const pageStart = safePage * PAGE_SIZE;
  const pageTasks = tasks.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter(); }}
      onDragLeave={(e) => {
        // Only fire when leaving the lane element itself, not when crossing
        // between child cards (which also bubble dragleave).
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        onDragLeaveLane();
      }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      style={{
        background: isDragOver ? theme.soft : C.white,
        borderRadius: 12,
        border: `1px solid ${isDragOver ? theme.strong : C.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 200,
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderBottom: `1px solid ${C.divider}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: theme.strong, display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.ink, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {priority}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.slate }}>
          {openCount} open{tasks.length > openCount ? ` · ${tasks.length - openCount} done` : ''}
        </span>
      </div>

      <div style={{ flex: 1, padding: 10 }}>
        {tasks.length === 0 ? (
          <div style={{ fontSize: 12, color: C.slate, padding: 14, textAlign: 'center', fontStyle: 'italic' }}>
            {isDragOver ? `Drop to set ${priority}` : 'No tasks'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {pageTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                today={today}
                theme={theme}
                dragging={draggedId === t.id}
                onDragStart={() => onDragStart(t.id)}
                onDragEnd={onDragEnd}
                onOpen={() => onOpen(t)}
                onToggle={() => onToggle(t)}
              />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderTop: `1px solid ${C.divider}`,
            background: C.seasalt,
          }}
        >
          <button
            onClick={() => onPageChange(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: safePage === 0 ? C.divider : C.white,
              color: safePage === 0 ? C.slate : C.green,
              fontFamily: 'Figtree',
              fontSize: 11,
              fontWeight: 700,
              cursor: safePage === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate }}>
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage >= totalPages - 1}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: safePage >= totalPages - 1 ? C.divider : C.white,
              color: safePage >= totalPages - 1 ? C.slate : C.green,
              fontFamily: 'Figtree',
              fontSize: 11,
              fontWeight: 700,
              cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  today,
  theme,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onToggle,
}: {
  task: Task;
  today: string;
  theme: { strong: string; soft: string; ink: string };
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const overdue = !task.done && task.due_date && daysBetween(task.due_date, today) > 0;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // Required to make the drag operation valid in Firefox.
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      title={task.title}
      style={{
        background: task.done ? C.seasalt : C.white,
        border: `1px solid ${task.done ? C.divider : theme.soft}`,
        borderLeft: `3px solid ${task.done ? C.slate : theme.strong}`,
        borderRadius: 8,
        padding: '8px 10px',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 64,
        opacity: dragging ? 0.4 : 1,
        transition: 'opacity 120ms, box-shadow 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          onMouseDown={(e) => e.stopPropagation()}
          draggable={false}
          style={{
            flexShrink: 0,
            marginTop: 1,
            display: 'inline-flex',
            width: 14,
            height: 14,
            borderRadius: 4,
            border: `2px solid ${task.done ? C.green : C.border}`,
            background: task.done ? C.green : C.white,
            color: C.white,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 800,
            cursor: 'pointer',
          }}
          aria-label={task.done ? 'Mark not done' : 'Mark done'}
          role="checkbox"
          aria-checked={task.done}
        >
          {task.done ? '✓' : ''}
        </span>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: task.done ? C.slate : C.ink,
            textDecoration: task.done ? 'line-through' : 'none',
            lineHeight: 1.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
            flex: 1,
          }}
        >
          {task.title}
        </div>
      </div>
      <div style={{ fontSize: 10, color: overdue ? C.error : C.slate, fontWeight: overdue ? 700 : 500, marginLeft: 20 }}>
        {task.due_date ? formatDate(task.due_date) : '—'}
      </div>
    </div>
  );
}
