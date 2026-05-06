-- ============================================================================
-- Voltara Operations Dashboard — initial schema
-- ============================================================================
-- Three canonical tables (customers, suppliers, products) referenced by FK
-- from every transactional table. Line items in invoices/quotes/POs are stored
-- as jsonb with a snapshot of the unit price at write time.
--
-- RLS is enabled with permissive policies for v1 (no auth). Tighten when
-- Supabase Auth is added — see CLAUDE.md.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Canonical: customers
-- ---------------------------------------------------------------------------
create table customers (
  id          text primary key,
  name        text not null,
  email       text,
  phone       text,
  address     text,
  type        text not null check (type in ('Residential','Commercial','Enterprise')),
  status      text not null default 'Active' check (status in ('Active','Inactive')),
  joined      date,
  notes       text,
  created_at  timestamptz not null default now()
);
create index idx_customers_status on customers(status);
create index idx_customers_type on customers(type);

-- ---------------------------------------------------------------------------
-- Canonical: suppliers
-- ---------------------------------------------------------------------------
create table suppliers (
  id              text primary key,
  name            text not null,
  category        text not null,
  status          text not null default 'Active' check (status in ('Active','Inactive','Prospect')),
  contact         text,
  email           text,
  phone           text,
  address         text,
  payment_terms   text,
  lead_time_days  int,
  reg_number      text,
  rating          numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  notes           text,
  created_at      timestamptz not null default now()
);
create index idx_suppliers_status on suppliers(status);
create index idx_suppliers_category on suppliers(category);

-- ---------------------------------------------------------------------------
-- Canonical: products  (= the "Inventory & Products" tab)
-- ---------------------------------------------------------------------------
create table products (
  id              text primary key,             -- SKU
  name            text not null,
  category        text not null,
  cost            numeric(12,2) not null default 0,
  price           numeric(12,2) not null default 0,
  qty             int not null default 0,
  reorder_level   int not null default 0,
  supplier_id     text references suppliers(id) on delete set null,
  location        text,
  created_at      timestamptz not null default now()
);
create index idx_products_supplier_id on products(supplier_id);
create index idx_products_category on products(category);

-- ---------------------------------------------------------------------------
-- Transactional: orders
-- ---------------------------------------------------------------------------
create table orders (
  id           text primary key,
  customer_id  text not null references customers(id),
  product_id   text not null references products(id),
  amount       numeric(12,2) not null,
  status       text not null,
  date         date not null
);
create index idx_orders_customer_id on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_orders_date on orders(date desc);

-- ---------------------------------------------------------------------------
-- Transactional: installations
-- ---------------------------------------------------------------------------
create table installations (
  id           text primary key,
  customer_id  text not null references customers(id),
  product_id   text not null references products(id),
  tech         text not null,
  scheduled    date not null,
  status       text not null
);
create index idx_installations_customer_id on installations(customer_id);
create index idx_installations_status on installations(status);
create index idx_installations_scheduled on installations(scheduled desc);

-- ---------------------------------------------------------------------------
-- Transactional: invoices
-- ---------------------------------------------------------------------------
create table invoices (
  id           text primary key,
  customer_id  text not null references customers(id),
  line_items   jsonb not null default '[]'::jsonb,   -- [{ product_id, qty, unit_price_snapshot }]
  discount     numeric(5,2) not null default 0,
  tax          numeric(5,2) not null default 0,
  notes        text,
  status       text not null check (status in ('Draft','Sent','Paid','Overdue','Cancelled')),
  issue_date   date not null,
  due_date     date not null,
  created_at   timestamptz not null default now()
);
create index idx_invoices_customer_id on invoices(customer_id);
create index idx_invoices_status on invoices(status);
create index idx_invoices_issue_date on invoices(issue_date desc);

-- ---------------------------------------------------------------------------
-- Transactional: quotes (quotations & proposals)
-- ---------------------------------------------------------------------------
create table quotes (
  id           text primary key,
  type         text not null check (type in ('Quotation','Proposal')),
  customer_id  text not null references customers(id),
  line_items   jsonb not null default '[]'::jsonb,
  discount     numeric(5,2) not null default 0,
  notes        text,
  status       text not null check (status in ('Draft','Sent','Viewed','Accepted','Declined','Expired')),
  valid_from   date not null,
  valid_to     date not null,
  created_at   timestamptz not null default now()
);
create index idx_quotes_customer_id on quotes(customer_id);
create index idx_quotes_status on quotes(status);
create index idx_quotes_type on quotes(type);

-- ---------------------------------------------------------------------------
-- Transactional: purchase_orders (incoming + outgoing)
-- ---------------------------------------------------------------------------
create table purchase_orders (
  id            text primary key,
  direction     text not null check (direction in ('outgoing','incoming')),
  supplier_id   text references suppliers(id),
  customer_id   text references customers(id),
  line_items    jsonb not null default '[]'::jsonb,
  discount      numeric(5,2) not null default 0,
  notes         text,
  external_ref  text,
  status        text not null check (status in ('Draft','Submitted','Approved','Received','Partial','Cancelled')),
  created_date  date not null,
  delivery_date date,
  created_at    timestamptz not null default now(),
  check (
    (direction = 'outgoing' and supplier_id is not null) or
    (direction = 'incoming' and customer_id is not null)
  )
);
create index idx_po_direction_status on purchase_orders(direction, status);
create index idx_po_supplier_id on purchase_orders(supplier_id);
create index idx_po_customer_id on purchase_orders(customer_id);

-- ---------------------------------------------------------------------------
-- Standalone: posts (social media planner)
-- ---------------------------------------------------------------------------
create table posts (
  id            text primary key,
  platform      text not null,
  title         text not null,
  caption       text,
  type          text not null,
  status        text not null check (status in ('Scheduled','Draft','Published','Needs Review')),
  scheduled_at  timestamptz not null,
  media_url     text,
  created_at    timestamptz not null default now()
);
create index idx_posts_status on posts(status);
create index idx_posts_scheduled_at on posts(scheduled_at desc);

-- ---------------------------------------------------------------------------
-- Views: derived stats for canonical entities (avoid storing denormalised data)
-- ---------------------------------------------------------------------------
create or replace view vw_customer_stats as
select
  c.id as customer_id,
  coalesce(o.installs, 0)::int as installs,
  coalesce(o.spend, 0)::numeric as spend
from customers c
left join (
  select customer_id, count(*) as installs, sum(amount) as spend
  from orders
  group by customer_id
) o on o.customer_id = c.id;

create or replace view vw_supplier_stats as
select
  s.id as supplier_id,
  coalesce(po.po_count, 0)::int as po_count,
  coalesce(po.total_spend, 0)::numeric as total_spend
from suppliers s
left join (
  select
    supplier_id,
    count(*) as po_count,
    sum(
      coalesce((
        select sum((li->>'qty')::numeric * (li->>'unit_price_snapshot')::numeric)
        from jsonb_array_elements(line_items) li
      ), 0)
      * (1 - coalesce(discount, 0) / 100)
    ) as total_spend
  from purchase_orders
  where direction = 'outgoing' and supplier_id is not null
  group by supplier_id
) po on po.supplier_id = s.id;

-- ---------------------------------------------------------------------------
-- RLS: enable + permissive policies for v1 (no auth)
-- TODO: tighten when Supabase Auth is added — replace `using (true)` with
--       `using (auth.role() = 'authenticated')` or per-org policies.
-- ---------------------------------------------------------------------------
alter table customers        enable row level security;
alter table suppliers        enable row level security;
alter table products         enable row level security;
alter table orders           enable row level security;
alter table installations    enable row level security;
alter table invoices         enable row level security;
alter table quotes           enable row level security;
alter table purchase_orders  enable row level security;
alter table posts            enable row level security;

create policy v1_anon_all on customers       for all using (true) with check (true);
create policy v1_anon_all on suppliers       for all using (true) with check (true);
create policy v1_anon_all on products        for all using (true) with check (true);
create policy v1_anon_all on orders          for all using (true) with check (true);
create policy v1_anon_all on installations   for all using (true) with check (true);
create policy v1_anon_all on invoices        for all using (true) with check (true);
create policy v1_anon_all on quotes          for all using (true) with check (true);
create policy v1_anon_all on purchase_orders for all using (true) with check (true);
create policy v1_anon_all on posts           for all using (true) with check (true);
