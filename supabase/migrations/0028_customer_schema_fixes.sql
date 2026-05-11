-- ============================================================================
-- Customer schema fixes — align DB with what the codebase expects
-- ============================================================================
-- Three drifts existed only in the old (now-inaccessible) project and were
-- never committed to migrations/:
--   1. customers.type CHECK constraint allowed ('Residential','Commercial','Enterprise')
--      but the UI sends ('Residential','Commercial','Condo','CPO').
--   2. attention_to column is read/written by the modal but didn't exist in the table.
--   3. lead_source column with its own enum didn't exist either.
--
-- Without these, the New Customer "Create" button silently fails because
-- supabase.from('customers').insert(…) rejects the unknown columns and the
-- modal swallows the error.
-- ============================================================================

-- 1. Replace customers.type CHECK constraint
alter table customers drop constraint if exists customers_type_check;

-- Move any legacy 'Enterprise' rows (from the original seed shape) onto a value
-- the new check allows. None should exist on a fresh project, but be defensive.
update customers set type = 'Commercial' where type = 'Enterprise';

alter table customers
  add constraint customers_type_check
  check (type in ('Residential','Commercial','Condo','CPO'));

-- 2. attention_to column — contact-person name
alter table customers add column if not exists attention_to text;

-- 3. lead_source column — restricted to the three values the UI offers
alter table customers add column if not exists lead_source text;

alter table customers drop constraint if exists customers_lead_source_check;
alter table customers
  add constraint customers_lead_source_check
  check (lead_source is null or lead_source in (
    'WhatsApp (Google)',
    'WhatsApp (Meta)',
    'Website Enquiry'
  ));
