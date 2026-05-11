-- ============================================================================
-- Deposit-due indicator on invoices
-- ============================================================================
-- Optional percentage the customer is asked to pay up-front, before any
-- actual payment is recorded. The PDF surfaces "DEPOSIT REQUIRED: X% =
-- RM Y" so the customer knows what to pay first. Once a payment is recorded
-- the deposit indicator is superseded by the actual payments list.
-- ============================================================================

alter table invoices
  add column deposit_percent numeric(5,2)
  check (deposit_percent is null or (deposit_percent >= 0 and deposit_percent <= 100));
