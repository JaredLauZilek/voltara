-- ============================================================================
-- Bill ↔ Installation link
-- ============================================================================
-- When a bill is filed under category 'Installation', it usually corresponds
-- to a specific job (one contractor invoice per site visit). Capturing the
-- link lets KPIs sum job COGS against job revenue without hand-keying refs.
--
-- Modelled as a nullable FK with a partial unique index so a single
-- installation can be linked to AT MOST ONE bill — but a bill without an
-- installation (everything outside the Installation category) is fine.
-- ON DELETE SET NULL — if the installation row is removed the bill stays
-- intact, just unlinked.
-- ============================================================================

alter table bills
  add column installation_id text references installations(id) on delete set null;

create index idx_bills_installation on bills(installation_id);

-- 1:1 — at most one bill per installation. Partial so multiple NULLs are OK.
create unique index uq_bills_installation
  on bills(installation_id)
  where installation_id is not null;
