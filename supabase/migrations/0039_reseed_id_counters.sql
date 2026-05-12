-- ============================================================================
-- Reseed id_counters from existing data
-- ============================================================================
-- Symptom: inserting a new contractor failed with
--   "duplicate key value violates unique constraint suppliers_pkey".
-- Root cause: id_counters was empty for prefix='SUP' even though a
--   SUP-202605-0001 row already existed in suppliers (created before the
--   counter row was initialised). next_id('SUP') was returning 0001 every
--   time and crashing against the PK.
--
-- This migration scans every entity table that uses the PREFIX-YYYYMM-####
-- scheme, computes max(seq) per (prefix, year), and upserts id_counters so
-- next_id() always moves forward past existing rows.
--
-- Idempotent: ON CONFLICT keeps the higher of (stored, computed) so a
-- re-run will never roll a counter backward.
-- ============================================================================

with all_ids as (
  select 'CUS'  as prefix, id from customers
  union all select 'SUP',  id from suppliers
  union all select 'SM',   id from sales_managers
  union all select 'QO',   id from quotes
  union all select 'INV',  id from invoices
  union all select 'INS',  id from installations
  union all select 'PO',   id from purchase_orders
  union all select 'BIL',  id from bills
  union all select 'EXP',  id from expenses
  union all select 'ORD',  id from orders
  union all select 'POST', id from posts
  union all select 'PAY',  id from invoice_payments
  -- Products: only count rows that still match the auto-assigned scheme.
  -- User-named SKUs (post-0038) are skipped so they can't pollute the counter.
  union all select 'SKU', id from products where id ~ '^SKU-\d{6}-\d{4}$'
),
parsed as (
  select
    prefix,
    (regexp_match(id, '^[A-Z]+-(\d{4})\d{2}-(\d+)$'))[1] as year,
    (regexp_match(id, '^[A-Z]+-\d{6}-(\d+)$'))[1]::int  as seq
  from all_ids
  where id ~ '^[A-Z]+-\d{6}-\d+$'
),
maxes as (
  select prefix, year, max(seq) as last_seq
  from parsed
  group by prefix, year
)
insert into id_counters (prefix, year, last_seq)
select prefix, year, last_seq from maxes
on conflict (prefix, year) do update
  set last_seq = greatest(id_counters.last_seq, excluded.last_seq);
