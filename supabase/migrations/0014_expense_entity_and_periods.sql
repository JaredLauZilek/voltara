-- Replace the "supplier link" with a free-text `entity` field (Google, YouTube, Bookstore A, etc.)
-- and add a `periods` JSONB column so a single recurring expense can carry per-month data
-- (status + paid_on + attachments) instead of duplicating into separate rows.

alter table expenses add column entity  text;
alter table expenses add column periods jsonb not null default '[]'::jsonb;

-- supplier_id column is left in place (additive migrations only) but the UI no longer uses it.
