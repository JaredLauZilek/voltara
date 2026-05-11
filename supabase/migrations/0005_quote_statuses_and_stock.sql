-- ============================================================================
-- Sales (quotes) — new statuses + stock deduction on Case Won
-- ============================================================================
-- Replaces the 6-value status set (Draft/Sent/Viewed/Accepted/Declined/Expired)
-- with a simplified 4-value set: Draft | Sent | Case Won | Case Lost
--
-- Stock deduction is moved from invoices to quotes:
--   - Case Won  → deduct products.qty
--   - Case Lost / Draft → restore products.qty (if previously deducted)
--
-- The invoice stock trigger added in 0004 is dropped to avoid double-deduction.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the old status CHECK constraint first so the data migration in
--    step 2 isn't rejected by the old allow-list (which doesn't include
--    'Case Won' / 'Case Lost').
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Migrate existing quote status data to new values
-- ---------------------------------------------------------------------------
update quotes set status = 'Case Won'  where status = 'Accepted';
update quotes set status = 'Case Lost' where status in ('Declined', 'Expired');
update quotes set status = 'Sent'      where status = 'Viewed';

-- ---------------------------------------------------------------------------
-- 3. Re-add the status CHECK constraint with the new allow-list
-- ---------------------------------------------------------------------------
alter table quotes
  add constraint quotes_status_check
  check (status in ('Draft', 'Sent', 'Case Won', 'Case Lost'));

-- ---------------------------------------------------------------------------
-- 3. Drop the invoice-level stock trigger (logic moves to quotes)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_invoice_stock_deduction on invoices;
drop function if exists fn_invoice_stock_deduction();

-- ---------------------------------------------------------------------------
-- 4. Add stock tracking to quotes
-- ---------------------------------------------------------------------------
alter table quotes
  add column stock_deducted boolean not null default false;

-- ---------------------------------------------------------------------------
-- 5. Quote stock trigger — deduct on Case Won, restore on Case Lost / Draft
-- ---------------------------------------------------------------------------
create or replace function fn_quote_stock_deduction()
returns trigger
language plpgsql
security definer
as $$
declare
  li        jsonb;
  p_id      text;
  p_qty     int;
  is_won    boolean;
begin
  is_won := NEW.status = 'Case Won';

  if TG_OP = 'INSERT' then
    if is_won then
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty where id = p_id;
      end loop;
      NEW.stock_deducted := true;
    end if;

  elsif TG_OP = 'UPDATE' then

    if is_won and not OLD.stock_deducted then
      -- Transitioned to Case Won — deduct
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty where id = p_id;
      end loop;
      NEW.stock_deducted := true;

    elsif not is_won and OLD.stock_deducted then
      -- Moved away from Case Won — restore
      for li in select * from jsonb_array_elements(OLD.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty + p_qty where id = p_id;
      end loop;
      NEW.stock_deducted := false;

    elsif OLD.stock_deducted and (NEW.line_items is distinct from OLD.line_items) then
      -- Line items edited on a Case Won quote — adjust delta
      for li in select * from jsonb_array_elements(OLD.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty + p_qty where id = p_id;
      end loop;
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty where id = p_id;
      end loop;
    end if;

  end if;

  return NEW;
end;
$$;

create trigger trg_quote_stock_deduction
  before insert or update on quotes
  for each row
  execute function fn_quote_stock_deduction();
