-- ============================================================================
-- Installations: tie each installation to a quote/proposal
-- ============================================================================
-- New installations are created from a Case Won (or in-flight) quote, so the
-- products being installed come from that quote's line_items rather than a
-- single product reference. We:
--   1. Add a nullable quote_id FK so existing rows stay valid.
--   2. Make product_id nullable — quote-linked rows derive products from the
--      quote's line items; legacy rows keep their original product_id value.
--   3. Add a CHECK on status to lock the known set of values.
--   4. Add a notes column for free-text site notes.
-- ============================================================================

alter table installations
  add column quote_id text references quotes(id),
  add column notes    text;

alter table installations
  alter column product_id drop not null;

alter table installations
  add constraint installations_status_check
  check (status in ('Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'));

create index idx_installations_quote_id on installations(quote_id);
