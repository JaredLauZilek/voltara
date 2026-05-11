-- ============================================================================
-- Products: user-supplied SKU on creation
-- ============================================================================
-- Until now, every products row had its id rewritten to SKU-YYYYMM-#### by the
-- trg_aaid_products trigger from migration 0031. The user wants to name the
-- SKU themselves (e.g. EVC-7KW-WB, CHG-DC-50). Drop the auto-assign trigger
-- and replace it with a guard that:
--
--   INSERT: honors the user-supplied id; falls back to next_id('SKU') only
--           when the client omits it (so any automation that still strips
--           the id keeps working).
--   UPDATE: keeps the SKU immutable — historical invoice/quote line items
--           snapshot product_id by value, and renaming would orphan them.
-- ============================================================================

drop trigger if exists trg_aaid_products on products;

create or replace function fn_products_id_guard()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.id is null or btrim(NEW.id) = '' then
      NEW.id := next_id('SKU');
    end if;
  elsif TG_OP = 'UPDATE' and OLD.id is distinct from NEW.id then
    raise exception 'SKU cannot be modified (was %, attempted %)', OLD.id, NEW.id
      using errcode = '23514';
  end if;
  return NEW;
end;
$$;

create trigger trg_products_id_guard
before insert or update on products
for each row execute function fn_products_id_guard();
