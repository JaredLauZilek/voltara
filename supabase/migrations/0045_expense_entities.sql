-- User-managed entity list for expenses (mirrors bill_categories pattern).
-- Also drops the NOT NULL constraint on expenses.payee since the modal no
-- longer asks for it — the entity now serves as the primary identifier.

alter table expenses alter column payee drop not null;

create table expense_entities (
  name text primary key,
  created_at timestamptz not null default now()
);
alter table expense_entities enable row level security;
create policy "expense_entities_all" on expense_entities for all using (true) with check (true);

insert into expense_entities (name) values
  ('Google'),
  ('YouTube'),
  ('Meta'),
  ('TNB'),
  ('Astro'),
  ('Office Petty Cash'),
  ('Internal'),
  ('Other')
on conflict (name) do nothing;
