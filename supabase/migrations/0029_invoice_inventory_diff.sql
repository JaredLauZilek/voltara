-- ============================================================================
-- Invoice → Inventory delta trigger
-- ============================================================================
-- The invoice is the final truth for inventory. Whenever an invoice's line
-- items change (or it's freshly inserted), apply the delta against
-- `products.qty` so stock stays accurate without manual reconciliation.
--
-- The quote's Case Won trigger already deducted the quote's items. So the
-- invoice trigger's baseline depends on the operation:
--   INSERT with quote_id → baseline = quote.line_items
--   INSERT without quote_id → baseline = empty (deduct everything; legacy path)
--   UPDATE → baseline = OLD.line_items
--
-- For every product_id present in either baseline or NEW.line_items,
-- delta = curr_qty - prev_qty, then `products.qty -= delta`. Services are
-- skipped (is_service = true) since they're untracked, matching migration 0006.
-- Custom rows (empty product_id) are skipped.
-- ============================================================================

create or replace function fn_invoice_inventory_diff()
returns trigger
language plpgsql
security definer
as $$
declare
  prev jsonb := '[]'::jsonb;
  curr jsonb := coalesce(NEW.line_items, '[]'::jsonb);
  li jsonb;
  pid text;
  qty_int int;
  delta_by_product jsonb := '{}'::jsonb;
  delta int;
begin
  if TG_OP = 'INSERT' then
    if NEW.quote_id is not null then
      select line_items into prev from quotes where id = NEW.quote_id;
      if prev is null then prev := '[]'::jsonb; end if;
    end if;
  else
    prev := coalesce(OLD.line_items, '[]'::jsonb);
  end if;

  -- Subtract prev qty per product (baseline already deducted from stock)
  for li in select * from jsonb_array_elements(prev) loop
    pid := li->>'product_id';
    if pid is null or pid = '' then continue; end if;
    qty_int := coalesce((li->>'qty')::int, 0);
    delta_by_product := jsonb_set(
      delta_by_product,
      array[pid],
      to_jsonb(coalesce((delta_by_product->>pid)::int, 0) - qty_int)
    );
  end loop;

  -- Add curr qty per product
  for li in select * from jsonb_array_elements(curr) loop
    pid := li->>'product_id';
    if pid is null or pid = '' then continue; end if;
    qty_int := coalesce((li->>'qty')::int, 0);
    delta_by_product := jsonb_set(
      delta_by_product,
      array[pid],
      to_jsonb(coalesce((delta_by_product->>pid)::int, 0) + qty_int)
    );
  end loop;

  -- Apply each non-zero delta: positive delta = more on invoice than baseline
  -- → deduct from stock. Negative delta = less → restore.
  for pid in select jsonb_object_keys(delta_by_product) loop
    delta := (delta_by_product->>pid)::int;
    if delta <> 0 then
      update products
        set qty = qty - delta
        where id = pid and is_service = false;
    end if;
  end loop;

  return NEW;
end;
$$;

create trigger trg_invoice_inventory_diff
  after insert or update on invoices
  for each row
  execute function fn_invoice_inventory_diff();
