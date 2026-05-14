-- Make expense categories user-managed (mirror bill_categories + expense_entities).

alter table expenses drop constraint if exists expenses_category_check;

create table expense_categories (
  name text primary key,
  created_at timestamptz not null default now()
);
alter table expense_categories enable row level security;
create policy "expense_categories_all" on expense_categories for all using (true) with check (true);

insert into expense_categories (name) values
  ('Rent'),
  ('Utilities'),
  ('Salary'),
  ('Reimbursement'),
  ('Subscription'),
  ('Office'),
  ('Travel'),
  ('Marketing'),
  ('Insurance'),
  ('Tax'),
  ('Maintenance'),
  ('Other')
on conflict (name) do nothing;
