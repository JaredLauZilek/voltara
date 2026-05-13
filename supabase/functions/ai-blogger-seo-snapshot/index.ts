// Supabase Edge Function — fetches an Ahrefs SEO snapshot for a published
// blog post and stores it as a row in blog_seo_snapshots.

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

interface RequestBody { draft_id: string }

async function ahrefs(path: string, token: string, params: Record<string, string>) {
  const url = new URL(`https://api.ahrefs.com${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ahrefsToken = Deno.env.get('AHREFS_API_KEY');
  if (!supabaseUrl || !supabaseServiceKey) return json(500, { ok: false, error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  if (!ahrefsToken) return json(500, { ok: false, error: 'Server missing AHREFS_API_KEY' });

  let body: RequestBody;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Invalid JSON body' }); }
  if (!body.draft_id) return json(400, { ok: false, error: 'draft_id is required' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: draft } = await supabase.from('blog_drafts').select('*').eq('id', body.draft_id).single();
  if (!draft) return json(404, { ok: false, error: `Draft ${body.draft_id} not found` });
  if (!draft.wix_post_url) return json(400, { ok: false, error: 'Draft has no published URL yet.' });

  const today = new Date().toISOString().slice(0, 10);

  // Pull a compact set of Ahrefs metrics for the URL.
  // Endpoints are v3 site-explorer; minor failures are tolerated and recorded.
  const [organic, domainRating, backlinks] = await Promise.all([
    ahrefs('/v3/site-explorer/organic-keywords-export', ahrefsToken, {
      target: draft.wix_post_url, mode: 'exact', date: today, limit: '20',
      order_by: 'position:asc', select: 'keyword,position,traffic,volume',
    }),
    ahrefs('/v3/site-explorer/domain-rating', ahrefsToken, {
      target: draft.wix_post_url, mode: 'exact', date: today,
    }),
    ahrefs('/v3/site-explorer/refdomains-export', ahrefsToken, {
      target: draft.wix_post_url, mode: 'exact', date: today, limit: '10',
    }),
  ]);

  const metrics = {
    organic_keywords: organic.ok ? organic.data : { error: organic.data?.error ?? `HTTP ${organic.status}` },
    domain_rating:    domainRating.ok ? domainRating.data : { error: domainRating.data?.error ?? `HTTP ${domainRating.status}` },
    refdomains:       backlinks.ok ? backlinks.data : { error: backlinks.data?.error ?? `HTTP ${backlinks.status}` },
    url: draft.wix_post_url,
    fetched_at: new Date().toISOString(),
  };

  const { data: snapshot, error: insertErr } = await supabase
    .from('blog_seo_snapshots')
    .insert({ draft_id: draft.id, metrics })
    .select()
    .single();
  if (insertErr) return json(500, { ok: false, error: `DB insert failed: ${insertErr.message}` });

  return json(200, { ok: true, snapshot });
});
