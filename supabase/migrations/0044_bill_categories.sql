-- Make bill categories user-managed (mirror supplier_categories pattern).

alter table bills drop constraint if exists bills_category_check;

create table bill_categories (
  name text primary key,
  created_at timestamptz not null default now()
);
alter table bill_categories enable row level security;
create policy "bill_categories_all" on bill_categories for all using (true) with check (true);

insert into bill_categories (name) values
  ('Materials'),
  ('Installation'),
  ('Labour'),
  ('Equipment'),
  ('Transport'),
  ('Subcontractor'),
  ('Professional Fees'),
  ('Utilities'),
  ('Maintenance'),
  ('Other')
on conflict (name) do nothing;
