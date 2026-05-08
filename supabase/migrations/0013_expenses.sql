-- Expenses ledger: rent, utilities, salary, reimbursements, subscriptions, etc.
-- Each row is a single occurrence. Recurring expenses (rent, utility) are flagged via
-- the `recurrence` column; the next occurrence is generated client-side via the modal's
-- "Duplicate to next period" action — no cron / Edge Function in v1.

create table expenses (
  id              text primary key,
  expense_date    date not null,
  category        text not null check (category in (
    'Rent','Utilities','Salary','Reimbursement','Subscription',
    'Office','Travel','Marketing','Insurance','Tax','Maintenance','Other'
  )),
  payee           text not null,
  payee_email     text,
  supplier_id     text references suppliers(id) on delete set null,
  amount          numeric(12,2) not null check (amount >= 0),
  payment_method  text check (payment_method in ('Cash','Bank Transfer','Credit Card','Cheque','Other')),
  reference       text,
  recurrence      text not null default 'None' check (recurrence in (
    'None','Weekly','Monthly','Quarterly','Yearly'
  )),
  status          text not null default 'Pending' check (status in ('Pending','Paid','Cancelled')),
  paid_on         date,
  attachments     jsonb not null default '[]'::jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_expenses_date     on expenses(expense_date desc);
create index idx_expenses_category on expenses(category);
create index idx_expenses_status   on expenses(status);

alter table expenses enable row level security;
create policy "allow all" on expenses for all using (true) with check (true);
