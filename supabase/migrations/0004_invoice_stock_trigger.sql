-- ============================================================================
-- Invoice → Inventory stock deduction
-- ============================================================================
-- Adds a `stock_deducted` boolean to invoices so the trigger knows whether
-- it has already decremented products.qty for a given invoice.
--
-- Deducting statuses : Sent, Paid, Overdue  (invoice has left the building)
-- Non-deducting      : Draft, Cancelled
--
-- Behaviour:
--   INSERT with deducting status      → deduct qty, set stock_deducted = true
--   UPDATE to deducting status        → deduct qty, set stock_deducted = true
--   UPDATE away from deducting status → restore qty, set stock_deducted = false
--   UPDATE line_items while deducted  → restore old items, deduct new items
-- ============================================================================

alter table invoices
  add column stock_deducted boolean not null default false;

-- ---------------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------------
create or replace function fn_invoice_stock_deduction()
returns trigger
language plpgsql
security definer
as $$
declare
  li        jsonb;
  p_id      text;
  p_qty     int;
  is_deducting boolean;
begin
  is_deducting := NEW.status in ('Sent', 'Paid', 'Overdue');

  if TG_OP = 'INSERT' then
    if is_deducting then
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty where id = p_id;
      end loop;
      NEW.stock_deducted := true;
    end if;

  elsif TG_OP = 'UPDATE' then

    if is_deducting and not OLD.stock_deducted then
      -- Transitioning into a deducting status
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty where id = p_id;
      end loop;
      NEW.stock_deducted := true;

    elsif not is_deducting and OLD.stock_deducted then
      -- Cancelled or moved back to Draft — restore stock
      for li in select * from jsonb_array_elements(OLD.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty + p_qty where id = p_id;
      end loop;
      NEW.stock_deducted := false;

    elsif OLD.stock_deducted and (NEW.line_items is distinct from OLD.line_items) then
      -- Line items edited while invoice is already in a deducting status
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

-- ---------------------------------------------------------------------------
-- Trigger
-- ---------------------------------------------------------------------------
create trigger trg_invoice_stock_deduction
  before insert or update on invoices
  for each row
  execute function fn_invoice_stock_deduction();
