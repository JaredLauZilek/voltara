// Supabase Edge Function — periodic orchestrator for the AI Blogger.
//
// On each tick (triggered by pg_cron / supabase cron):
//   1. Publishes any 'scheduled' drafts whose scheduled_at <= now().
//   2. Fetches a fresh Ahrefs snapshot for each published draft whose latest
//      snapshot is older than ~7 days (or has none).
//
// Approved drafts are NOT auto-published — the user always clicks Publish
// manually for those.
//
// This function delegates to the per-action functions (ai-blogger-publish,
// ai-blogger-seo-snapshot) by invoking them through Supabase. Failures are
// non-fatal — we log and move on so one bad draft doesn't block the queue.

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SNAPSHOT_FRESHNESS_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  // Accept both POST (manual / cron) and GET (health check).
  if (req.method !== 'POST' && req.method !== 'GET') return json(405, { ok: false, error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) return json(500, { ok: false, error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const summary = {
    published_scheduled: [] as string[],
    snapshots_taken: [] as string[],
    errors: [] as { id: string; stage: string; message: string }[],
  };

  const invoke = async (fn: string, body: unknown): Promise<{ ok: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke<{ ok: boolean; error?: string }>(fn, { body });
    if (error) return { ok: false, error: error.message };
    return { ok: !!data?.ok, error: data?.error };
  };

  // 1. Publish scheduled drafts whose time has come.
  //    Approved drafts are NOT auto-published — the user always clicks Publish
  //    manually for those.
  const nowIso = new Date().toISOString();
  const { data: scheduled = [] } = await supabase
    .from('blog_drafts')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowIso);
  for (const d of scheduled ?? []) {
    const r = await invoke('ai-blogger-publish', { draft_id: d.id });
    if (r.ok) summary.published_scheduled.push(d.id);
    else summary.errors.push({ id: d.id, stage: 'publish_scheduled', message: r.error ?? 'unknown' });
  }

  // 2. SEO snapshots for published posts with stale (or missing) latest snapshot.
  const { data: published = [] } = await supabase.from('blog_drafts').select('id, wix_post_url, published_at').eq('status', 'published');
  const cutoff = new Date(Date.now() - SNAPSHOT_FRESHNESS_DAYS * 86_400_000).toISOString();
  for (const d of published ?? []) {
    if (!d.wix_post_url) continue;
    const { data: latest } = await supabase
      .from('blog_seo_snapshots')
      .select('fetched_at')
      .eq('draft_id', d.id)
      .order('fetched_at', { ascending: false })
      .limit(1);
    const isStale = !latest || latest.length === 0 || latest[0].fetched_at < cutoff;
    if (!isStale) continue;
    const r = await invoke('ai-blogger-seo-snapshot', { draft_id: d.id });
    if (r.ok) summary.snapshots_taken.push(d.id);
    else summary.errors.push({ id: d.id, stage: 'seo_snapshot', message: r.error ?? 'unknown' });
  }

  return json(200, { ok: true, summary });
});
