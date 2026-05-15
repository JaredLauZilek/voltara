-- ============================================================================
-- Snapshot infrastructure
-- ============================================================================
-- Lets us travel back to a known-good state. A nightly `snapshot-db` edge
-- function (scheduled via pg_cron + pg_net) dumps every public.* table as
-- JSON plus the entire `attachments` bucket into a single zip, uploads it
-- to a new private `backups` bucket, and prunes to the 3 most recent.
-- See /Users/jaredlau_macmini/.claude/plans/help-me-check-why-lazy-hamming.md
-- ============================================================================

-- 1. Private bucket for the snapshot zips
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

-- 2. Audit table — UI reads from here, the edge function writes here
create table if not exists snapshot_meta (
  id            bigserial primary key,
  taken_at      timestamptz not null default now(),
  storage_path  text        not null,                      -- backups/<file>
  bytes         bigint,
  table_counts  jsonb,                                     -- {customers:33, …}
  trigger       text not null check (trigger in ('cron','manual')),
  status        text not null default 'pending'
                  check (status in ('pending','completed','failed')),
  error         text,
  duration_ms   int
);
create index if not exists idx_snapshot_meta_taken_at on snapshot_meta(taken_at desc);
alter table snapshot_meta enable row level security;
create policy "allow all" on snapshot_meta for all using (true) with check (true);

-- 3. Extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 4. Nightly schedule (02:00 KL = 18:00 UTC).
--    The shared secret is inlined here; it lives only in cron.job which is
--    superuser-visible (not exposed to the API).
do $$
declare
  v_url    text := 'https://ntyfaecigomupacwjgyz.functions.supabase.co/snapshot-db';
  v_secret text := '6206ec3a6a72b9c5bde439e916e67f1130aa9c567eb2aae0';
begin
  -- Idempotent: unschedule first so re-running the migration replaces it
  perform cron.unschedule('voltara-nightly-snapshot')
  where exists (select 1 from cron.job where jobname='voltara-nightly-snapshot');

  perform cron.schedule(
    'voltara-nightly-snapshot',
    '0 18 * * *',
    format($cmd$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Snapshot-Secret', %L
        ),
        body := jsonb_build_object('trigger', 'cron')
      );
    $cmd$, v_url, v_secret)
  );
end $$;
