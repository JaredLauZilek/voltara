-- ============================================================================
-- Receipt as a first-class doc type
-- ============================================================================
-- The receipt PDF reuses the invoice's form_design (column visibility, accent,
-- terms, signature block, etc.) — only the heading swaps to OFFICIAL RECEIPT.
-- The email side, however, needs its own template (the customer is being
-- thanked, not asked to pay), so we add 'receipt' to email_designs only.
--
-- We still extend the form_designs check constraint so DocType is uniform
-- across the codebase; we just don't seed a form_designs row for receipts
-- and the form-designs UI filters 'receipt' out of its tab list.
-- ============================================================================

alter table form_designs  drop constraint if exists form_designs_doc_type_check;
alter table form_designs  add  constraint form_designs_doc_type_check
  check (doc_type in ('invoice', 'quote', 'delivery_order', 'purchase_order', 'receipt'));

alter table email_designs drop constraint if exists email_designs_doc_type_check;
alter table email_designs add  constraint email_designs_doc_type_check
  check (doc_type in ('invoice', 'quote', 'delivery_order', 'purchase_order', 'receipt'));

insert into email_designs (doc_type, subject_template, intro_text, body_text)
values (
  'receipt',
  'Receipt {{doc.id}} from {{company.name}}',
  'Thank you for your payment. Your official receipt is attached for your records.',
  'If you have any questions about this receipt, just reply to this email.'
)
on conflict (doc_type) do nothing;
