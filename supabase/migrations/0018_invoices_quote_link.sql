-- ============================================================================
-- Invoices: tie each invoice to a quote/proposal
-- ============================================================================
-- Going forward every invoice is generated from an accepted quote — selecting
-- the quote pre-fills the customer, line items, and discount. Existing rows
-- predate this rule, so the column is nullable and enforcement happens at
-- the application level for new inserts.
-- ============================================================================

alter table invoices
  add column quote_id text references quotes(id);

create index idx_invoices_quote_id on invoices(quote_id);
