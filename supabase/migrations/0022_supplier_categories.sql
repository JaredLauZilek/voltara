create table supplier_categories (
  name text primary key,
  created_at timestamptz not null default now()
);
insert into supplier_categories (name) values
  ('Charger OEM'),
  ('Electrical Equipment'),
  ('Electrical Components'),
  ('Internal')
on conflict (name) do nothing;
alter table supplier_categories enable row level security;
create policy "supplier_categories_all" on supplier_categories for all using (true) with check (true);
