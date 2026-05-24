-- ============================================================================
-- Tasks — user-added to-dos / follow-ups
-- ============================================================================
-- Powers the To-Do screen. The screen ALSO surfaces derived work (pending
-- installations, outstanding invoices, unpaid bills/expenses, quotes that
-- need a follow-up) — those are computed live from their own tables and are
-- NOT stored here. This table is strictly for ad-hoc items the user types in.
--
-- `related_kind` + `related_id` are an optional, soft link to any other
-- record (a quote to chase, an invoice to follow up, etc.) so a task can be
-- pinned to context without a hard FK across many tables.
-- ============================================================================

create table tasks (
  id            text primary key,
  title         text not null,
  notes         text,
  due_date      date,
  priority      text not null default 'Normal'
                  check (priority in ('Low','Normal','High')),
  done          boolean not null default false,
  done_at       timestamptz,
  -- Soft link to a related record. Both columns set together or both null.
  related_kind  text check (related_kind in ('installation','invoice','bill','expense','quote','customer','supplier')),
  related_id    text,
  created_at    timestamptz not null default now()
);

create index idx_tasks_done     on tasks(done);
create index idx_tasks_due_date on tasks(due_date);
create index idx_tasks_priority on tasks(priority);

alter table tasks enable row level security;
create policy v1_anon_all on tasks for all using (true) with check (true);

-- Server-assigned TSK-YYYYMM-#### id (per migration 0031 conventions).
create trigger trg_aaid_tasks
  before insert or update on tasks
  for each row execute function fn_assign_id('TSK');
