-- ============================================================================
-- Services support in products table
-- ============================================================================
-- Services are always available (no stock tracking). They live in the same
-- products table so they appear in the ProductPicker for quotes/invoices.
-- A default description can be set and overridden per line item in a quote.
-- ============================================================================

-- qty is now nullable; NULL means "no stock tracking" (i.e. a service)
alter table products alter column qty drop not null;

alter table products
  add column is_service  boolean not null default false,
  add column description text;

-- ---------------------------------------------------------------------------
-- Update the quote stock trigger to skip service line items
-- (services have is_service = true and qty IS NULL — deducting them would fail)
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
        update products set qty = qty - p_qty
          where id = p_id and is_service = false;
      end loop;
      NEW.stock_deducted := true;
    end if;

  elsif TG_OP = 'UPDATE' then

    if is_won and not OLD.stock_deducted then
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty
          where id = p_id and is_service = false;
      end loop;
      NEW.stock_deducted := true;

    elsif not is_won and OLD.stock_deducted then
      for li in select * from jsonb_array_elements(OLD.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty + p_qty
          where id = p_id and is_service = false;
      end loop;
      NEW.stock_deducted := false;

    elsif OLD.stock_deducted and (NEW.line_items is distinct from OLD.line_items) then
      for li in select * from jsonb_array_elements(OLD.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty + p_qty
          where id = p_id and is_service = false;
      end loop;
      for li in select * from jsonb_array_elements(NEW.line_items) loop
        p_id  := li->>'product_id';
        p_qty := (li->>'qty')::int;
        update products set qty = qty - p_qty
          where id = p_id and is_service = false;
      end loop;
    end if;

  end if;

  return NEW;
end;
$$;
