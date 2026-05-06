-- ============================================================================
-- Form Designs — shared company branding + per-doctype overrides for PDFs
-- ============================================================================
-- Two tables:
--   company_profile   — single row, drives all 4 PDF-exported documents.
--   form_designs      — one row per doc type (invoice / quote / DO / PO).
--
-- The renderer at src/features/invoices/pdf/ is currently a placeholder.
-- This migration only stores the *configuration* the renderer will read once
-- it ships. No template variants per doc type for v1.
--
-- Logo is stored as a base64 data URL inline (text column) — keeps the
-- migration self-contained. Move to Supabase Storage in a follow-up if logos
-- routinely exceed ~200KB.
-- ============================================================================

create table company_profile (
  id                text primary key default 'default',
  company_name      text not null default 'Voltara Sdn Bhd',
  address           text,
  registration_no   text,
  tax_id            text,
  phone             text,
  email             text,
  website           text,
  bank_details      text,
  logo_data_url     text,
  brand_color       text not null default '#1B512D',
  font_family       text not null default 'Figtree' check (font_family in ('Figtree', 'Helvetica', 'Times', 'Courier')),
  paper_size        text not null default 'A4'      check (paper_size  in ('A4', 'Letter')),
  updated_at        timestamptz not null default now(),
  check (id = 'default')
);

create table form_designs (
  doc_type              text primary key check (doc_type in ('invoice', 'quote', 'delivery_order', 'purchase_order')),
  accent_color          text,
  header_note           text,
  footer_text           text,
  terms_text            text,
  payment_instructions  text,
  show_logo             boolean not null default true,
  show_company_address  boolean not null default true,
  show_customer_address boolean not null default true,
  show_notes            boolean not null default true,
  show_signature_block  boolean not null default false,
  column_visibility     jsonb   not null default '{"sku":true,"description":true,"qty":true,"unit_price":true,"tax":false,"line_total":true}'::jsonb,
  updated_at            timestamptz not null default now()
);

-- Seed: one default branding row + one row per doc type so the UI never
-- sees an empty state and the upsert path is always an UPDATE.
insert into company_profile (id) values ('default');
insert into form_designs (doc_type) values
  ('invoice'),
  ('quote'),
  ('delivery_order'),
  ('purchase_order');

alter table company_profile enable row level security;
alter table form_designs    enable row level security;
create policy "allow all" on company_profile for all using (true) with check (true);
create policy "allow all" on form_designs    for all using (true) with check (true);
