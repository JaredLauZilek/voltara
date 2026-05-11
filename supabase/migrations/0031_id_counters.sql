-- ============================================================================
-- Year-month grouped, server-assigned, gap-tolerant IDs
-- ============================================================================
-- Every transactional + entity row gets an id of the form  <PREFIX>-YYYYMM-####
--   e.g. QO-202605-0001, INV-202605-0042
--
-- Three guarantees:
--   1. The client is never the source of truth — a BEFORE INSERT trigger
--      overwrites whatever id the frontend sent.
--   2. The id is immutable — UPDATEs that change `id` raise an exception.
--   3. Deleted rows never free their numbers — id_counters.last_seq only goes
--      up per (prefix, period) bucket.
--
-- The atomic counter uses INSERT ... ON CONFLICT DO UPDATE ... RETURNING so
-- concurrent transactions can't collide on the same sequence value.
-- ============================================================================

create table id_counters (
  prefix    text not null,
  period    text not null,
  last_seq  int  not null default 0,
  primary key (prefix, period)
);

alter table id_counters enable row level security;
create policy "allow all" on id_counters for all using (true) with check (true);

create or replace function next_id(p_prefix text, p_date date default current_date)
returns text
language plpgsql
as $$
declare
  p_period text := to_char(p_date, 'YYYYMM');
  next_seq int;
begin
  insert into id_counters as c (prefix, period, last_seq)
  values (p_prefix, p_period, 1)
  on conflict (prefix, period) do update
    set last_seq = c.last_seq + 1
  returning last_seq into next_seq;
  return p_prefix || '-' || p_period || '-' || lpad(next_seq::text, 4, '0');
end;
$$;

create or replace function fn_assign_id()
returns trigger
language plpgsql
as $$
declare
  v_prefix text := TG_ARGV[0];
begin
  if TG_OP = 'INSERT' then
    NEW.id := next_id(v_prefix);
  elsif TG_OP = 'UPDATE' and OLD.id is distinct from NEW.id then
    raise exception 'ID of % cannot be modified (was %, attempted %)',
      TG_TABLE_NAME, OLD.id, NEW.id
      using errcode = '23514';
  end if;
  return NEW;
end;
$$;

-- Per-table triggers. Naming uses `trg_aaid_*` so the assign-id trigger sorts
-- alphabetically before existing BEFORE-row triggers (stock_deduction, won_at,
-- etc.) and runs first, ensuring downstream triggers see the final id.
create trigger trg_aaid_customers       before insert or update on customers       for each row execute function fn_assign_id('CUS');
create trigger trg_aaid_suppliers       before insert or update on suppliers       for each row execute function fn_assign_id('SUP');
create trigger trg_aaid_products        before insert or update on products        for each row execute function fn_assign_id('SKU');
create trigger trg_aaid_sales_managers  before insert or update on sales_managers  for each row execute function fn_assign_id('SM');
create trigger trg_aaid_quotes          before insert or update on quotes          for each row execute function fn_assign_id('QO');
create trigger trg_aaid_invoices        before insert or update on invoices        for each row execute function fn_assign_id('INV');
create trigger trg_aaid_installations   before insert or update on installations   for each row execute function fn_assign_id('INS');
create trigger trg_aaid_purchase_orders before insert or update on purchase_orders for each row execute function fn_assign_id('PO');
create trigger trg_aaid_bills           before insert or update on bills           for each row execute function fn_assign_id('BIL');
create trigger trg_aaid_expenses        before insert or update on expenses        for each row execute function fn_assign_id('EXP');
create trigger trg_aaid_orders          before insert or update on orders          for each row execute function fn_assign_id('ORD');
create trigger trg_aaid_posts           before insert or update on posts           for each row execute function fn_assign_id('POST');
