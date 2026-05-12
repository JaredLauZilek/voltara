-- ============================================================================
-- Engagement-aware stock model
-- ============================================================================
-- Previously the quote and invoice each maintained their own view of stock,
-- using OLD.line_items as the baseline for the diff. That broke whenever the
-- *other* document changed in between:
--
--   * Re-sync invoice from quote → invoice trigger over-deducted because the
--     quote trigger had already applied the swap.
--   * Cancel an invoice → no effect on stock; the customer's "extras" stayed
--     reserved.
--   * Revert Case Won → Sent while invoice exists → quote restored stock that
--     the invoice still needed.
--
-- New model: at any moment, stock removed for a (quote, invoice) engagement
-- equals the **per-product max** of the two records' line items (the high
-- water mark). Whichever trigger fires recomputes that max for prev and
-- curr state, applies the delta, and never double-counts.
--
-- Status-aware rules:
--   - Quote not in 'Case Won' contributes [] (revertable reservation).
--   - Invoice in 'Cancelled' contributes [] (engagement dead from invoice side).
--
-- Bag math is done inline. A helper view/function isn't worth the indirection.
-- ============================================================================

-- Drop old function bodies so the CREATE OR REPLACE doesn't preserve stale
-- branches. fn_invoice_resync_status_on_total_change is unrelated and kept.

create or replace function fn_invoice_inventory_diff()
returns trigger
language plpgsql
security definer
as $$
declare
  v_quote_lines jsonb := '[]'::jsonb;
  v_prev_items  jsonb;
  v_curr_items  jsonb;
  v_prev_bag    jsonb := '{}'::jsonb;
  v_curr_bag    jsonb := '{}'::jsonb;
  v_li          jsonb;
  v_pid         text;
  v_qty         int;
  v_delta       int;
begin
  if NEW.quote_id is not null then
    select coalesce(line_items, '[]'::jsonb) into v_quote_lines from quotes
     where id = NEW.quote_id;
    if v_quote_lines is null then v_quote_lines := '[]'::jsonb; end if;
  end if;

  -- prev invoice items (treat Cancelled as empty, INSERT as empty)
  if TG_OP = 'INSERT' then
    v_prev_items := '[]'::jsonb;
  else
    v_prev_items := case
      when OLD.status = 'Cancelled' then '[]'::jsonb
      else coalesce(OLD.line_items, '[]'::jsonb)
    end;
  end if;
  v_curr_items := case
    when NEW.status = 'Cancelled' then '[]'::jsonb
    else coalesce(NEW.line_items, '[]'::jsonb)
  end;

  -- Build prev_bag = pointwise_max(prev_items_summed, quote_lines_summed)
  for v_li in select * from jsonb_array_elements(v_prev_items) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_prev_bag := jsonb_set(v_prev_bag, array[v_pid],
      to_jsonb(coalesce((v_prev_bag->>v_pid)::int, 0) + v_qty));
  end loop;
  for v_li in select * from jsonb_array_elements(v_quote_lines) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_prev_bag := jsonb_set(v_prev_bag, array[v_pid],
      to_jsonb(greatest(coalesce((v_prev_bag->>v_pid)::int, 0), v_qty)));
  end loop;

  -- Build curr_bag = pointwise_max(curr_items_summed, quote_lines_summed)
  for v_li in select * from jsonb_array_elements(v_curr_items) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_curr_bag := jsonb_set(v_curr_bag, array[v_pid],
      to_jsonb(coalesce((v_curr_bag->>v_pid)::int, 0) + v_qty));
  end loop;
  for v_li in select * from jsonb_array_elements(v_quote_lines) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_curr_bag := jsonb_set(v_curr_bag, array[v_pid],
      to_jsonb(greatest(coalesce((v_curr_bag->>v_pid)::int, 0), v_qty)));
  end loop;

  -- Apply delta = curr_bag - prev_bag per product
  for v_pid in
    select jsonb_object_keys(v_prev_bag || v_curr_bag)
  loop
    v_delta := coalesce((v_curr_bag->>v_pid)::int, 0)
             - coalesce((v_prev_bag->>v_pid)::int, 0);
    if v_delta <> 0 then
      update products set qty = qty - v_delta
       where id = v_pid and is_service = false;
    end if;
  end loop;

  return NEW;
end;
$$;


-- Quote stock trigger uses the same bag math, but pulls the *current* invoice
-- line items via the back reference (invoices.quote_id). 'Cancelled' invoices
-- contribute []; 'not Case Won' quotes contribute [].
create or replace function fn_quote_stock_deduction()
returns trigger
language plpgsql
security definer
as $$
declare
  v_inv_lines   jsonb := '[]'::jsonb;
  v_prev_quote  jsonb;
  v_curr_quote  jsonb;
  v_prev_bag    jsonb := '{}'::jsonb;
  v_curr_bag    jsonb := '{}'::jsonb;
  v_li          jsonb;
  v_pid         text;
  v_qty         int;
  v_delta       int;
begin
  -- The linked (non-Cancelled) invoice, if any. Only one allowed via the new
  -- unique partial index, so limit 1 is fine.
  select coalesce(line_items, '[]'::jsonb) into v_inv_lines
    from invoices
   where quote_id = NEW.id and status <> 'Cancelled'
   limit 1;
  if v_inv_lines is null then v_inv_lines := '[]'::jsonb; end if;

  if TG_OP = 'INSERT' then
    v_prev_quote := '[]'::jsonb;
  else
    v_prev_quote := case when OLD.status = 'Case Won'
      then coalesce(OLD.line_items, '[]'::jsonb)
      else '[]'::jsonb
    end;
  end if;
  v_curr_quote := case when NEW.status = 'Case Won'
    then coalesce(NEW.line_items, '[]'::jsonb)
    else '[]'::jsonb
  end;

  -- Build prev_bag = pointwise_max(prev_quote_summed, inv_lines_summed)
  for v_li in select * from jsonb_array_elements(v_prev_quote) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_prev_bag := jsonb_set(v_prev_bag, array[v_pid],
      to_jsonb(coalesce((v_prev_bag->>v_pid)::int, 0) + v_qty));
  end loop;
  for v_li in select * from jsonb_array_elements(v_inv_lines) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_prev_bag := jsonb_set(v_prev_bag, array[v_pid],
      to_jsonb(greatest(coalesce((v_prev_bag->>v_pid)::int, 0), v_qty)));
  end loop;

  -- Build curr_bag = pointwise_max(curr_quote_summed, inv_lines_summed)
  for v_li in select * from jsonb_array_elements(v_curr_quote) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_curr_bag := jsonb_set(v_curr_bag, array[v_pid],
      to_jsonb(coalesce((v_curr_bag->>v_pid)::int, 0) + v_qty));
  end loop;
  for v_li in select * from jsonb_array_elements(v_inv_lines) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_curr_bag := jsonb_set(v_curr_bag, array[v_pid],
      to_jsonb(greatest(coalesce((v_curr_bag->>v_pid)::int, 0), v_qty)));
  end loop;

  for v_pid in
    select jsonb_object_keys(v_prev_bag || v_curr_bag)
  loop
    v_delta := coalesce((v_curr_bag->>v_pid)::int, 0)
             - coalesce((v_prev_bag->>v_pid)::int, 0);
    if v_delta <> 0 then
      update products set qty = qty - v_delta
       where id = v_pid and is_service = false;
    end if;
  end loop;

  -- Keep the legacy flag aligned with current status so old code reading it
  -- still gets the right answer.
  NEW.stock_deducted := (NEW.status = 'Case Won');
  return NEW;
end;
$$;


-- Delete paths: same engagement-bag idea. On invoice delete, the engagement
-- collapses to "just the quote". On quote delete, the FK already blocks the
-- delete if an invoice exists (NO ACTION), so we only need to handle the
-- "no invoice" case here.
create or replace function fn_invoice_delete_reverse_diff()
returns trigger
language plpgsql
security definer
as $$
declare
  v_quote_lines jsonb := '[]'::jsonb;
  v_prev_items  jsonb;
  v_prev_bag    jsonb := '{}'::jsonb;
  v_curr_bag    jsonb := '{}'::jsonb;
  v_li          jsonb;
  v_pid         text;
  v_qty         int;
  v_delta       int;
begin
  if OLD.quote_id is not null then
    select coalesce(line_items, '[]'::jsonb) into v_quote_lines from quotes
     where id = OLD.quote_id;
    if v_quote_lines is null then v_quote_lines := '[]'::jsonb; end if;
  end if;

  v_prev_items := case
    when OLD.status = 'Cancelled' then '[]'::jsonb
    else coalesce(OLD.line_items, '[]'::jsonb)
  end;

  -- prev_bag = max(OLD invoice, quote_lines)
  for v_li in select * from jsonb_array_elements(v_prev_items) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_prev_bag := jsonb_set(v_prev_bag, array[v_pid],
      to_jsonb(coalesce((v_prev_bag->>v_pid)::int, 0) + v_qty));
  end loop;
  for v_li in select * from jsonb_array_elements(v_quote_lines) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_prev_bag := jsonb_set(v_prev_bag, array[v_pid],
      to_jsonb(greatest(coalesce((v_prev_bag->>v_pid)::int, 0), v_qty)));
  end loop;

  -- curr_bag = just the quote (engagement after invoice is gone)
  for v_li in select * from jsonb_array_elements(v_quote_lines) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    v_curr_bag := jsonb_set(v_curr_bag, array[v_pid],
      to_jsonb(coalesce((v_curr_bag->>v_pid)::int, 0) + v_qty));
  end loop;

  for v_pid in
    select jsonb_object_keys(v_prev_bag || v_curr_bag)
  loop
    v_delta := coalesce((v_curr_bag->>v_pid)::int, 0)
             - coalesce((v_prev_bag->>v_pid)::int, 0);
    if v_delta <> 0 then
      update products set qty = qty - v_delta
       where id = v_pid and is_service = false;
    end if;
  end loop;

  return OLD;
end;
$$;


-- Quote delete: by FK, only reachable when no invoice exists. So engagement
-- before = OLD quote (if Case Won), engagement after = []. Restore.
create or replace function fn_quote_delete_restore_stock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_li jsonb;
  v_pid text;
  v_qty int;
begin
  if OLD.status <> 'Case Won' then return OLD; end if;
  for v_li in select * from jsonb_array_elements(coalesce(OLD.line_items, '[]'::jsonb)) loop
    v_pid := v_li->>'product_id';
    if v_pid is null or v_pid = '' then continue; end if;
    v_qty := coalesce((v_li->>'qty')::int, 0);
    if v_qty <> 0 then
      update products set qty = qty + v_qty
       where id = v_pid and is_service = false;
    end if;
  end loop;
  return OLD;
end;
$$;


-- Unique invoice per quote — partial so quote_id can be null.
create unique index if not exists uq_invoices_quote_id
  on invoices (quote_id)
  where quote_id is not null;
