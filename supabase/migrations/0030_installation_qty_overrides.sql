-- ============================================================================
-- Installation per-line qty overrides for the Delivery Order
-- ============================================================================
-- The DO is built from the linked quote's line_items but on site the actual
-- delivered quantity may differ (substitution, partial delivery, addition).
-- Store the per-line override as a JSONB map keyed by the line item's index
-- (stringified) in the linked quote: { "0": 2, "2": 1 }.
--
-- The override is display-only — inventory is governed by the invoice trigger
-- (migration 0029) and the quote's Case Won trigger. Editing qty here does
-- NOT mutate `products.qty`.
-- ============================================================================

alter table installations
  add column qty_overrides jsonb not null default '{}'::jsonb;
