alter table quotes add column won_at timestamptz;

-- Backfill existing Case Won rows with created_at as best approximation
update quotes set won_at = created_at where status = 'Case Won';

-- Trigger: set won_at when status transitions to Case Won; clear it when moving away
create or replace function set_quote_won_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'Case Won' and (old.status is distinct from 'Case Won') then
    new.won_at = now();
  elsif new.status <> 'Case Won' then
    new.won_at = null;
  end if;
  return new;
end;
$$;

create trigger trg_quote_won_at
before update on quotes
for each row execute function set_quote_won_at();
