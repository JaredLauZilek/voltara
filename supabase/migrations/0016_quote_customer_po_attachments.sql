alter table quotes add column customer_po_attachments jsonb not null default '[]'::jsonb;
