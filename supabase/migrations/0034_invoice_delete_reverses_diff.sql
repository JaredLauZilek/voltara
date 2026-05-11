-- ============================================================================
-- AFTER DELETE trigger on invoices — reverse the inventory delta
-- ============================================================================
-- Migration 0029 added an AFTER INSERT/UPDATE trigger that applies
-- (NEW.line_items − baseline) to products.qty. Deleting the invoice didn't
-- reverse that adjustment, so inventory stayed shifted by the delta.
--
-- On DELETE, the effective baseline becomes the quote's line_items (since
-- the quote's Case Won already deducted that amount) and the "current"
-- becomes empty — so we want to reverse the diff between OLD.line_items and
-- the linked quote. If there's no quote_id, treat baseline as empty (the
-- invoice's full line items were the deduction; restore them all).
-- ============================================================================

create or replace function fn_invoice_delete_reverse_diff()
returns trigger
language plpgsql
security definer
as $$
declare
  baseline jsonb := '[]'::jsonb;
  applied  jsonb := coalesce(OLD.line_items, '[]'::jsonb);
  li       jsonb;
  pid      text;
  qty_int  int;
  delta_by_product jsonb := '{}'::jsonb;
  delta    int;
begin
  if OLD.quote_id is not null then
    select line_items into baseline from quotes where id = OLD.quote_id;
    if baseline is null then baseline := '[]'::jsonb; end if;
  end if;

  -- Net delta that was applied = applied − baseline (per product).
  -- Reverse it by applying (baseline − applied) to products.qty (subtract NEW=0,
  -- add OLD): products.qty += applied − baseline (since deletion undoes the
  -- earlier `qty = qty - delta` from migration 0029).

  -- Subtract baseline qty (the part that was NOT the invoice's own delta)
  for li in select * from jsonb_array_elements(baseline) loop
    pid := li->>'product_id';
    if pid is null or pid = '' then continue; end if;
    qty_int := coalesce((li->>'qty')::int, 0);
    delta_by_product := jsonb_set(
      delta_by_product,
      array[pid],
      to_jsonb(coalesce((delta_by_product->>pid)::int, 0) - qty_int)
    );
  end loop;

  -- Add applied qty (the part the invoice trigger had deducted from stock)
  for li in select * from jsonb_array_elements(applied) loop
    pid := li->>'product_id';
    if pid is null or pid = '' then continue; end if;
    qty_int := coalesce((li->>'qty')::int, 0);
    delta_by_product := jsonb_set(
      delta_by_product,
      array[pid],
      to_jsonb(coalesce((delta_by_product->>pid)::int, 0) + qty_int)
    );
  end loop;

  -- delta = applied − baseline. Reverse means products.qty += delta.
  for pid in select jsonb_object_keys(delta_by_product) loop
    delta := (delta_by_product->>pid)::int;
    if delta <> 0 then
      update products
         set qty = qty + delta
       where id = pid and is_service = false;
    end if;
  end loop;

  return OLD;
end;
$$;

create trigger trg_invoice_delete_reverse_diff
  after delete on invoices
  for each row
  execute function fn_invoice_delete_reverse_diff();
