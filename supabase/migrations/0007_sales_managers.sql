-- Sales managers table
create table sales_managers (
  id             text primary key,
  name           text not null,
  email          text,
  phone          text,
  target_revenue numeric not null default 0,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table sales_managers enable row level security;
create policy "allow all" on sales_managers for all using (true) with check (true);

-- Link quotes to a sales manager
alter table quotes add column sales_manager_id text references sales_managers(id);
