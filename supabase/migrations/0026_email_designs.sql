-- Email Designs feature — singleton company-level routing/signature defaults
-- + per-doc-type design row (subject, intro, body, signature, footer, routing
-- overrides, accent colour, toggles). Mirrors the form_designs pattern so the
-- UI never sees an empty result: seed 1 company row + 4 doc-type rows.

CREATE TABLE company_email_profile (
  id                   TEXT PRIMARY KEY DEFAULT 'default',
  default_from_name    TEXT NOT NULL DEFAULT 'Voltara Sdn Bhd',
  default_from_address TEXT NOT NULL DEFAULT 'noreply@voltara.com.my',
  default_reply_to     TEXT,
  default_cc           TEXT,
  default_bcc          TEXT,
  default_signature    TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 'default')
);

CREATE TABLE email_designs (
  doc_type          TEXT PRIMARY KEY
    CHECK (doc_type IN ('invoice', 'quote', 'delivery_order', 'purchase_order')),
  -- Routing overrides (NULL = inherit from company_email_profile defaults)
  from_name         TEXT,
  from_address      TEXT,
  reply_to          TEXT,
  cc                TEXT,
  bcc               TEXT,
  -- Structured content (the renderer wraps these in HTML — no raw HTML editing)
  subject_template  TEXT NOT NULL DEFAULT '{{doc.kind}} {{doc.id}} from {{company.name}}',
  intro_text        TEXT,
  body_text         TEXT,
  signature_text    TEXT,
  footer_text       TEXT,
  accent_color      TEXT,
  attach_pdf        BOOLEAN NOT NULL DEFAULT TRUE,
  show_logo         BOOLEAN NOT NULL DEFAULT TRUE,
  show_doc_summary  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO company_email_profile (id) VALUES ('default');

INSERT INTO email_designs (doc_type, subject_template, intro_text, body_text) VALUES
  ('quote',
    'Quotation {{doc.id}} from {{company.name}}',
    'Thank you for the opportunity to quote on your project. Please find our quotation attached.',
    'The quotation is valid until {{doc.valid_to}}. Let us know if you have any questions or would like to proceed.'),
  ('invoice',
    'Invoice {{doc.id}} from {{company.name}}',
    'Please find your invoice attached.',
    'Payment is due by {{doc.due_date}}. Our bank details are included in the attached PDF.'),
  ('delivery_order',
    'Delivery Order {{doc.id}} from {{company.name}}',
    'Your delivery is scheduled. Details are attached.',
    'Please confirm receipt by replying to this email. Reach out if anything looks off.'),
  ('purchase_order',
    'Purchase Order {{doc.id}} from {{company.name}}',
    'Please find our purchase order attached.',
    'Kindly acknowledge receipt and confirm the delivery date. Contact us if anything needs clarifying.');

ALTER TABLE company_email_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON company_email_profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON email_designs        FOR ALL USING (true) WITH CHECK (true);
