-- ============================================================================
-- Engagement stock — stored applied state + movement audit log
-- ============================================================================
-- Previous design (migration 0040) computed `prev_bag` from OLD.line_items
-- and the quote's current state. It was correct in isolation but assumed
-- the trigger's last run was successful and that nothing else mutated stock
-- between runs — assumptions that drift under partial failure or manual SQL.
--
-- New design:
--   * Each (quote, invoice) engagement is keyed by `quote_id` in a dedicated
--     table, `engagement_stock`. Its `applied_state` column stores the
--     `{product_id: qty}` bag that was last applied to products.qty.
--   * Whenever the quote or invoice changes, fn_recompute_engagement_stock
--     recomputes the target bag (pointwise max of the quote and invoice
--     line items, gated by Case Won / not-Cancelled), diffs against
--     applied_state, applies the delta, logs to stock_movements, and
--     updates applied_state. Self-healing — repeated runs are idempotent.
--   * Every delta gets a row in `stock_movements` for audit.
--
-- Semantics matching the user's clarification:
--   - 1× SKU-A in quote + 1× SKU-A in invoice  → 1 deduction (union, not sum).
--   - 3× SKU-B in invoice only                 → 3 deductions.
-- This is pointwise_max(quote_bag, invoice_bag) per product.
-- ============================================================================

create table if not exists engagement_stock (
  quote_id        text primary key references quotes(id) on delete cascade,
  applied_state   jsonb       not null default '{}'::jsonb,
  last_recompute  timestamptz not null default now()
);
alter table engagement_stock enable row level security;
create policy "allow all" on engagement_stock for all using (true) with check (true);

create table if not exists stock_movements (
  id           bigserial primary key,
  product_id   text        not null,
  delta        int         not null,
  reason       text        not null,
  quote_id     text,
  invoice_id   text,
  applied_at   timestamptz not null default now()
);
create index if not exists idx_stock_movements_product on stock_movements(product_id);
create index if not exists idx_stock_movements_quote   on stock_movements(quote_id)   where quote_id is not null;
create index if not exists idx_stock_movements_invoice on stock_movements(invoice_id) where invoice_id is not null;
alter table stock_movements enable row level security;
create policy "allow all" on stock_movements for all using (true) with check (true);


-- ----------------------------------------------------------------------------
-- Helper: compute the engagement's target bag from current DB state.
-- ----------------------------------------------------------------------------
create or replace function fn_compute_engagement_target_bag(p_quote_id text)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_quote   quotes%rowtype;
  v_invoice invoices%rowtype;
  v_bag     jsonb := '{}'::jsonb;
  v_inv_bag jsonb := '{}'::jsonb;
  v_li      jsonb;
  v_pid     text;
  v_qty     int;
begin
  if p_quote_id is null then return '{}'::jsonb; end if;
  select * into v_quote from quotes where id = p_quote_id;
  if not found then return '{}'::jsonb; end if;
  select * into v_invoice from invoices where quote_id = p_quote_id;

  -- Quote items count only when Case Won
  if v_quote.status = 'Case Won' then
    for v_li in select * from jsonb_array_elements(coalesce(v_quote.line_items, '[]'::jsonb)) loop
      v_pid := v_li->>'product_id';
      if v_pid is null or v_pid = '' then continue; end if;
      v_qty := coalesce((v_li->>'qty')::int, 0);
      v_bag := jsonb_set(v_bag, array[v_pid],
        to_jsonb(coalesce((v_bag->>v_pid)::int, 0) + v_qty));
    end loop;
  end if;

  -- Invoice items count unless Cancelled
  if v_invoice.id is not null and v_invoice.status <> 'Cancelled' then
    for v_li in select * from jsonb_array_elements(coalesce(v_invoice.line_items, '[]'::jsonb)) loop
      v_pid := v_li->>'product_id';
      if v_pid is null or v_pid = '' then continue; end if;
      v_qty := coalesce((v_li->>'qty')::int, 0);
      v_inv_bag := jsonb_set(v_inv_bag, array[v_pid],
        to_jsonb(coalesce((v_inv_bag->>v_pid)::int, 0) + v_qty));
    end loop;
    -- pointwise_max with the quote bag built above
    for v_pid in select jsonb_object_keys(v_inv_bag) loop
      v_bag := jsonb_set(v_bag, array[v_pid],
        to_jsonb(greatest(
          coalesce((v_bag->>v_pid)::int, 0),
          coalesce((v_inv_bag->>v_pid)::int, 0)
        )));
    end loop;
  end if;

  return v_bag;
end;
$$;


-- ----------------------------------------------------------------------------
-- Main: recompute engagement; apply delta; log; persist new applied_state.
-- ----------------------------------------------------------------------------
create or replace function fn_recompute_engagement_stock(p_quote_id text)
returns void
language plpgsql
security definer
as $$
declare
  v_target  jsonb;
  v_applied jsonb;
  v_inv_id  text;
  v_pid     text;
  v_delta   int;
begin
  if p_quote_id is null then return; end if;
  if not exists (select 1 from quotes where id = p_quote_id) then
    -- Quote gone; the BEFORE DELETE trigger handles restoration. Nothing to do.
    return;
  end if;

  v_target := fn_compute_engagement_target_bag(p_quote_id);
  select applied_state into v_applied from engagement_stock where quote_id = p_quote_id;
  if v_applied is null then v_applied := '{}'::jsonb; end if;

  select id into v_inv_id from invoices where quote_id = p_quote_id;

  for v_pid in select jsonb_object_keys(v_applied || v_target) loop
    v_delta := coalesce((v_target->>v_pid)::int, 0) - coalesce((v_applied->>v_pid)::int, 0);
    if v_delta <> 0 then
      update products set qty = qty - v_delta
       where id = v_pid and is_service = false;
      insert into stock_movements (product_id, delta, reason, quote_id, invoice_id)
        values (v_pid, -v_delta, 'engagement_recompute', p_quote_id, v_inv_id);
    end if;
  end loop;

  insert into engagement_stock (quote_id, applied_state, last_recompute)
    values (p_quote_id, v_target, now())
  on conflict (quote_id) do update
    set applied_state = excluded.applied_state, last_recompute = now();
end;
$$;


-- ----------------------------------------------------------------------------
-- Trigger wrappers
-- ----------------------------------------------------------------------------
create or replace function fn_quote_engagement_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  perform fn_recompute_engagement_stock(NEW.id);
  return NEW;
end;
$$;

create or replace function fn_quote_stock_flag()
returns trigger
language plpgsql
as $$
begin
  -- Legacy flag — kept in sync with status so old code reading it still works.
  NEW.stock_deducted := (NEW.status = 'Case Won');
  return NEW;
end;
$$;

create or replace function fn_invoice_engagement_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'UPDATE' and OLD.quote_id is distinct from NEW.quote_id and OLD.quote_id is not null then
    -- Re-pointed to a different quote — old engagement needs to recompute too.
    perform fn_recompute_engagement_stock(OLD.quote_id);
  end if;
  if NEW.quote_id is not null then
    perform fn_recompute_engagement_stock(NEW.quote_id);
  end if;
  return NEW;
end;
$$;

create or replace function fn_invoice_delete_engagement_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  if OLD.quote_id is not null then
    perform fn_recompute_engagement_stock(OLD.quote_id);
  end if;
  return OLD;
end;
$$;

-- Quote delete: restore everything in applied_state, since the engagement
-- ends entirely (FK blocks delete if an invoice still exists, so there's no
-- other party to keep the engagement alive).
create or replace function fn_quote_delete_restore_stock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_applied jsonb;
  v_pid     text;
  v_qty     int;
begin
  select applied_state into v_applied from engagement_stock where quote_id = OLD.id;
  if v_applied is null or v_applied = '{}'::jsonb then return OLD; end if;

  for v_pid in select jsonb_object_keys(v_applied) loop
    v_qty := coalesce((v_applied->>v_pid)::int, 0);
    if v_qty <> 0 then
      update products set qty = qty + v_qty
       where id = v_pid and is_service = false;
      insert into stock_movements (product_id, delta, reason, quote_id)
        values (v_pid, v_qty, 'quote_deleted', OLD.id);
    end if;
  end loop;
  -- engagement_stock row cascade-deletes via FK
  return OLD;
end;
$$;


-- ----------------------------------------------------------------------------
-- Swap in the new triggers
-- ----------------------------------------------------------------------------
drop trigger if exists trg_quote_stock_deduction        on quotes;
drop trigger if exists trg_quote_delete_restore_stock   on quotes;
drop trigger if exists trg_invoice_inventory_diff       on invoices;
drop trigger if exists trg_invoice_delete_reverse_diff  on invoices;

-- Keep stock_deducted in sync (BEFORE so NEW assignment persists)
create trigger trg_quote_stock_flag
before insert or update on quotes
for each row execute function fn_quote_stock_flag();

-- Recompute after the new row is visible
create trigger trg_quote_engagement
after insert or update on quotes
for each row execute function fn_quote_engagement_trigger();

-- Quote delete must happen BEFORE so we can still read engagement_stock
create trigger trg_quote_delete_restore_stock
before delete on quotes
for each row execute function fn_quote_delete_restore_stock();

create trigger trg_invoice_engagement
after insert or update on invoices
for each row execute function fn_invoice_engagement_trigger();

create trigger trg_invoice_delete_engagement
after delete on invoices
for each row execute function fn_invoice_delete_engagement_trigger();


-- ----------------------------------------------------------------------------
-- Backfill engagement_stock for current quotes. Treats the present product
-- qty as already-correct and records the engagement bag as applied_state so
-- the next trigger run computes delta=0 and doesn't double-apply.
-- ----------------------------------------------------------------------------
insert into engagement_stock (quote_id, applied_state)
select q.id, fn_compute_engagement_target_bag(q.id)
  from quotes q
 where q.status = 'Case Won'
    or exists (select 1 from invoices i where i.quote_id = q.id)
on conflict (quote_id) do update set applied_state = excluded.applied_state;
