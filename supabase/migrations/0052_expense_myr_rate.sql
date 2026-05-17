-- Snapshot the MYR exchange rate used at the time the expense is saved, so
-- KPI conversions stay stable as live FX moves. Per-period rates live inside
-- the existing untyped `periods` JSONB and don't need a column here.
--
-- Nullable: existing rows + RM-denominated rows leave it null; the app falls
-- back to the static MYR_RATES table when reading.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS myr_rate numeric(12, 6);
