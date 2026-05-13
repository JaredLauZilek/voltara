# `ai-blogger-tick`

Periodic orchestrator. On each tick it:
1. Publishes any `scheduled` drafts whose `scheduled_at <= now()`.
2. Refreshes Ahrefs snapshots for `published` drafts whose latest snapshot is older than 7 days (or none).

Approved drafts are **not** auto-published — the user always clicks Publish manually for those. Failures are non-fatal — one bad draft can't block the rest of the queue. The summary is returned in the response for observability.

This function is **deployed without JWT verification** (`verify_jwt: false`) so it can be triggered from `pg_cron` or any external scheduler without a Supabase user JWT.

## No own secrets

Reuses the auto-injected `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The functions it invokes (`ai-blogger-publish`, `ai-blogger-seo-snapshot`) hold their own secrets.

## Manual trigger

```bash
curl -X POST "https://<project>.functions.supabase.co/ai-blogger-tick"
```

## Cron setup (pick one)

### Option A — Supabase Cron (UI, recommended)

Open **Supabase dashboard → Database → Cron → New cron job**:
- Name: `ai-blogger-tick-hourly`
- Schedule: `0 * * * *` (top of every hour) — or whatever cadence you want
- Type: HTTP Request
- Method: POST
- URL: `https://<project>.functions.supabase.co/ai-blogger-tick`
- Body: `{}`

### Option B — `pg_cron` + `pg_net` SQL

Run once in the Supabase SQL editor:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'ai-blogger-tick-hourly',
  '0 * * * *',
  $$ select net.http_post(
       url := 'https://<project>.functions.supabase.co/ai-blogger-tick',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
```

Inspect with `select * from cron.job;` and remove with `select cron.unschedule('ai-blogger-tick-hourly');`.
