-- ============================================================================
-- Invoice payments (split collection)
-- ============================================================================
-- Each invoice can take any number of payments. Status is auto-derived from
-- the sum of payments and the invoice total. Overpayment is blocked at the
-- DB layer.
-- ============================================================================

-- 1. Table -------------------------------------------------------------------
create table invoice_payments (
  id          text primary key,
  invoice_id  text not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     date not null,
  method      text check (method in ('Cash','Bank Transfer','Credit Card','Cheque','Other')),
  reference   text,
  label       text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index idx_invoice_payments_invoice_id on invoice_payments(invoice_id);
create index idx_invoice_payments_paid_on    on invoice_payments(paid_on desc);

alter table invoice_payments enable row level security;
create policy "allow all" on invoice_payments for all using (true) with check (true);

-- 2. Id-counter trigger ------------------------------------------------------
-- Reuses fn_assign_id() from migration 0031 with prefix 'PAY'.
create trigger trg_aaid_invoice_payments
  before insert or update on invoice_payments
  for each row execute function fn_assign_id('PAY');

-- 3. Status enum extension ---------------------------------------------------
-- Drop old check then re-add with 'Partially Paid' included.
do $$
declare
  cname text;
begin
  select conname into cname
    from pg_constraint
   where conrelid = 'invoices'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%';
  if cname is not null then
    execute format('alter table invoices drop constraint %I', cname);
  end if;
end;
$$;

alter table invoices
  add constraint invoices_status_check
  check (status in ('Draft','Sent','Partially Paid','Paid','Overdue','Cancelled'));

-- 4. Helper to compute invoice total (matches calcInvoiceTotals in the UI) ---
create or replace function fn_invoice_total(p_invoice_id text)
returns numeric
language plpgsql
stable
as $$
declare
  inv      invoices%rowtype;
  li       jsonb;
  subtotal numeric := 0;
  qty      numeric;
  price    numeric;
begin
  select * into inv from invoices where id = p_invoice_id;
  if not found then return 0; end if;
  for li in select * from jsonb_array_elements(coalesce(inv.line_items, '[]'::jsonb)) loop
    qty   := coalesce((li->>'qty')::numeric, 0);
    price := coalesce((li->>'unit_price_snapshot')::numeric, 0);
    subtotal := subtotal + qty * price;
  end loop;
  -- (subtotal - discount%) + tax%
  declare
    after_discount numeric := subtotal * (1 - coalesce(inv.discount, 0) / 100);
    tax_amt        numeric := after_discount * (coalesce(inv.tax, 0) / 100);
  begin
    return round(after_discount + tax_amt, 2);
  end;
end;
$$;

-- 5. Overpayment guard (BEFORE INSERT/UPDATE) --------------------------------
create or replace function fn_invoice_payment_overpayment_guard()
returns trigger
language plpgsql
as $$
declare
  total      numeric;
  paid_other numeric;
  proposed   numeric;
begin
  total := fn_invoice_total(NEW.invoice_id);
  select coalesce(sum(amount), 0) into paid_other
    from invoice_payments
   where invoice_id = NEW.invoice_id
     and (TG_OP = 'INSERT' or id <> OLD.id);
  proposed := paid_other + NEW.amount;
  if proposed > total + 0.005 then
    raise exception 'Overpayment blocked: invoice % total is RM%, payments would sum to RM%',
      NEW.invoice_id, total, proposed
      using errcode = '23514';
  end if;
  return NEW;
end;
$$;

create trigger trg_invoice_payment_overpayment_guard
  before insert or update on invoice_payments
  for each row execute function fn_invoice_payment_overpayment_guard();

-- 6. Status auto-derivation (AFTER INSERT/UPDATE/DELETE) ---------------------
create or replace function fn_invoice_payment_sync_status()
returns trigger
language plpgsql
security definer
as $$
declare
  v_invoice_id text;
  total        numeric;
  paid         numeric;
  cur_status   text;
  new_status   text;
begin
  v_invoice_id := coalesce(NEW.invoice_id, OLD.invoice_id);
  total := fn_invoice_total(v_invoice_id);
  select coalesce(sum(amount), 0) into paid
    from invoice_payments
   where invoice_id = v_invoice_id;
  select status into cur_status from invoices where id = v_invoice_id;

  if cur_status = 'Cancelled' then
    -- Never overwrite Cancelled.
    return coalesce(NEW, OLD);
  end if;

  if total > 0 and total - paid <= 0.005 then
    new_status := 'Paid';
  elsif paid > 0 then
    new_status := 'Partially Paid';
  elsif cur_status in ('Paid', 'Partially Paid') then
    -- All payments removed — drop back to Sent (or Draft if it was Draft).
    new_status := 'Sent';
  else
    new_status := cur_status;
  end if;

  if new_status is distinct from cur_status then
    update invoices set status = new_status where id = v_invoice_id;
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_invoice_payment_sync_status
  after insert or update or delete on invoice_payments
  for each row execute function fn_invoice_payment_sync_status();

-- 7. Also re-sync when invoice line_items change (re-totals can flip status) -
create or replace function fn_invoice_resync_status_on_total_change()
returns trigger
language plpgsql
security definer
as $$
declare
  total      numeric;
  paid       numeric;
  new_status text;
begin
  if OLD.line_items is not distinct from NEW.line_items
     and OLD.discount is not distinct from NEW.discount
     and OLD.tax is not distinct from NEW.tax then
    return NEW;
  end if;
  if NEW.status = 'Cancelled' then return NEW; end if;

  total := fn_invoice_total(NEW.id);
  select coalesce(sum(amount), 0) into paid
    from invoice_payments
   where invoice_id = NEW.id;

  if total > 0 and total - paid <= 0.005 then
    new_status := 'Paid';
  elsif paid > 0 then
    new_status := 'Partially Paid';
  elsif NEW.status in ('Paid', 'Partially Paid') then
    new_status := 'Sent';
  else
    new_status := NEW.status;
  end if;

  if new_status is distinct from NEW.status then
    NEW.status := new_status;
  end if;
  return NEW;
end;
$$;

create trigger trg_invoice_resync_status_on_total_change
  before update on invoices
  for each row execute function fn_invoice_resync_status_on_total_change();
