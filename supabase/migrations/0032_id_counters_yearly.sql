-- ============================================================================
-- Re-key id_counters from (prefix, month) to (prefix, year)
-- ============================================================================
-- The id format stays unchanged — <PREFIX>-YYYYMM-#### — but the sequence
-- bucket is now per-year, so numbers continue across months and only reset
-- on January 1.
--
-- Example:
--   QO-202605-0099 (last quote in May 2026)
--   QO-202606-0100 (first quote in June 2026 — counter continues)
--   QO-202701-0001 (first quote in January 2027 — counter resets)
--
-- Safe to drop+recreate id_counters because migration 0031 was applied
-- against a freshly-truncated DB; the counter has no live data to preserve.
-- ============================================================================

drop table id_counters;

create table id_counters (
  prefix    text not null,
  year      text not null,   -- 4-digit year, e.g. '2026'
  last_seq  int  not null default 0,
  primary key (prefix, year)
);

alter table id_counters enable row level security;
create policy "allow all" on id_counters for all using (true) with check (true);

create or replace function next_id(p_prefix text, p_date date default current_date)
returns text
language plpgsql
as $$
declare
  p_year   text := to_char(p_date, 'YYYY');
  p_period text := to_char(p_date, 'YYYYMM');
  next_seq int;
begin
  insert into id_counters as c (prefix, year, last_seq)
  values (p_prefix, p_year, 1)
  on conflict (prefix, year) do update
    set last_seq = c.last_seq + 1
  returning last_seq into next_seq;
  return p_prefix || '-' || p_period || '-' || lpad(next_seq::text, 4, '0');
end;
$$;
