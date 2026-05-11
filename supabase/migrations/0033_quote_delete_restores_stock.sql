-- ============================================================================
-- AFTER DELETE trigger on quotes — restore stock if it was deducted
-- ============================================================================
-- Migration 0005 added BEFORE INSERT/UPDATE triggers that deduct stock when a
-- quote transitions into Case Won (and restore it when transitioning out).
-- But DELETE was never handled: a Case Won quote that got deleted left
-- products.qty permanently low.
--
-- This trigger restores stock for any deleted row where stock_deducted was
-- true at the moment of delete. Services are skipped (matching the trigger
-- from migration 0006).
-- ============================================================================

create or replace function fn_quote_delete_restore_stock()
returns trigger
language plpgsql
security definer
as $$
declare
  li     jsonb;
  p_id   text;
  p_qty  int;
begin
  if OLD.stock_deducted then
    for li in select * from jsonb_array_elements(OLD.line_items) loop
      p_id  := li->>'product_id';
      if p_id is null or p_id = '' then continue; end if;
      p_qty := coalesce((li->>'qty')::int, 0);
      update products
         set qty = qty + p_qty
       where id = p_id and is_service = false;
    end loop;
  end if;
  return OLD;
end;
$$;

create trigger trg_quote_delete_restore_stock
  after delete on quotes
  for each row
  execute function fn_quote_delete_restore_stock();
