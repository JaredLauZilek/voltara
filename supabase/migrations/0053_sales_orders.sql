-- ============================================================================
-- Sales Orders — Voltara-side record of a customer's incoming PO
-- ============================================================================
-- Workflow:
--   Quote (Case Won) → Customer issues their own PO → we log it here as a
--   Sales Order. SO is the bridge between sales acceptance and fulfilment
--   (Installations / deliveries). One quote → at most one SO; the SO can
--   spawn many installations.
--
-- Mirror of purchase_orders but inverted: customer-facing, RM-only, and the
-- "external_ref" semantics flip — instead of OUR ref on the supplier, it's
-- THEIR PO number on their letterhead.
-- ============================================================================

create table sales_orders (
  id                 text primary key,
  -- Required link to a Case Won quote. RESTRICT — refuse to drop a quote that
  -- has a downstream SO; force the user to delete the SO first.
  quote_id           text not null references quotes(id) on delete restrict,
  -- Denormalised from quote.customer_id at write time so the SO can be filtered
  -- without joining. Always kept in sync by the BEFORE INSERT/UPDATE trigger.
  customer_id        text not null references customers(id),
  -- The customer's own PO reference (e.g. "PO-CHEMPLAS-2026-0042") and date.
  -- Both required — the whole point of the record is to capture them.
  customer_po_ref    text not null,
  customer_po_date   date not null,
  -- Snapshot from quote at link-time; user can adjust qty / unit price before
  -- saving for partial-fulfilment cases.
  line_items         jsonb not null default '[]'::jsonb,
  discount           numeric(12,2) not null default 0,
  notes              text,
  status             text not null default 'Open'
                       check (status in ('Open','Confirmed','Fulfilled','Cancelled')),
  -- Customer's PO PDF/scan, following the Attachment shape used elsewhere.
  attachments        jsonb not null default '[]'::jsonb,
  created_date       date not null default current_date,
  created_at         timestamptz not null default now()
);

create index idx_so_customer    on sales_orders(customer_id);
create index idx_so_quote       on sales_orders(quote_id);
create index idx_so_status      on sales_orders(status);
-- One SO per quote — enforces the 1:1 link. NULL impossible because quote_id is NOT NULL.
create unique index uq_so_quote on sales_orders(quote_id);

alter table sales_orders enable row level security;
create policy v1_anon_all on sales_orders for all using (true) with check (true);

-- Server-assigned SO-YYYYMM-#### id. Sort prefix 'aaid' so this trigger runs
-- before any downstream BEFORE-row trigger and they see the final id.
create trigger trg_aaid_sales_orders
  before insert or update on sales_orders
  for each row execute function fn_assign_id('SO');
