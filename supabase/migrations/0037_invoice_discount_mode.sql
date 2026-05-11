-- ============================================================================
-- Dual-mode invoice discount (% or fixed RM)
-- ============================================================================
-- The existing `invoices.discount` column was numeric(5,2) and always meant
-- "percent". Widen it to numeric(12,2) so it can also hold a fixed RM amount,
-- and add a `discount_mode` column to disambiguate. Default mode is 'percent'
-- so legacy rows retain their semantics.
--
-- Also update the server-side total helper from migration 0035 so the
-- overpayment guard and status-sync triggers reflect amount-mode correctly.
-- ============================================================================

alter table invoices
  alter column discount type numeric(12, 2);

alter table invoices
  add column discount_mode text not null default 'percent'
  check (discount_mode in ('percent', 'amount'));

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
  declare
    discount_amt    numeric;
    after_discount  numeric;
    tax_amt         numeric;
  begin
    if inv.discount_mode = 'amount' then
      discount_amt := least(coalesce(inv.discount, 0), subtotal);
    else
      discount_amt := subtotal * coalesce(inv.discount, 0) / 100;
    end if;
    after_discount := subtotal - discount_amt;
    tax_amt        := after_discount * (coalesce(inv.tax, 0) / 100);
    return round(after_discount + tax_amt, 2);
  end;
end;
$$;
