-- ============================================================================
-- Add 'Expired' as a valid quote status
-- ============================================================================
-- Expired = quote passed its valid_to date without a decision (or manually set).
-- For win-rate purposes it counts as a loss alongside Case Lost.
-- The existing stock trigger already handles Case Won → Expired correctly
-- (it restores stock), so no trigger changes are needed.
-- ============================================================================

-- 1. Replace CHECK constraint to include 'Expired'
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'quotes'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if cname is not null then
    execute format('alter table quotes drop constraint %I', cname);
  end if;
end;
$$;

alter table quotes
  add constraint quotes_status_check
  check (status in ('Draft', 'Sent', 'Case Won', 'Case Lost', 'Expired'));

-- 2. Back-fill: expire any Draft/Sent quotes whose valid_to has already passed
update quotes
set status = 'Expired'
where valid_to < current_date
  and status in ('Draft', 'Sent');
