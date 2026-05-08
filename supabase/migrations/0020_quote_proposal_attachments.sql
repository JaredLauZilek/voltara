alter table quotes add column proposal_attachments jsonb not null default '[]'::jsonb;
