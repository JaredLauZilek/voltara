create table quote_sets (
  id text primary key,
  name text not null,
  description text,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table quote_sets enable row level security;
create policy "quote_sets_all" on quote_sets for all using (true) with check (true);
