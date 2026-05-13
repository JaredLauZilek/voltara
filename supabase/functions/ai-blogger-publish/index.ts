// Supabase Edge Function — publishes a blog_draft to Wix Blog v3.
// 1. Loads the draft + ai_blogger_config from the DB.
// 2. Converts the Markdown body into a minimal Ricos document (paragraph nodes).
// 3. Creates a Wix draft post via REST API, then publishes it.
// 4. Stamps the draft with wix_post_id, wix_post_url, status='published'.
//    On any failure the draft is stamped status='failed' with the reason.

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

// Bare-bones Markdown → Ricos conversion.
// Ricos is Wix's rich-content JSON format. We emit one node per logical block:
//   - blank lines split paragraphs
//   - lines starting with `# ` / `## ` / `### ` become HEADING nodes
//   - lines starting with `- ` / `* ` become BULLETED_LIST items
// Anything fancier (links, inline emphasis) is preserved as plain text in v1.
function markdownToRicos(md: string) {
  const lines = md.split('\n');
  const nodes: any[] = [];
  let counter = 0;
  const nextId = () => `n${++counter}`;

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\r$/, '');
    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = Math.min(hMatch[1].length, 6);
      nodes.push({
        type: 'HEADING',
        id: nextId(),
        headingData: { level },
        nodes: [textNode(nextId(), hMatch[2].trim())],
      });
      i++;
      continue;
    }
    // Bulleted list (collect contiguous items)
    if (/^\s*[-*]\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const m = lines[i].match(/^\s*[-*]\s+(.+)$/);
        items.push({
          type: 'LIST_ITEM',
          id: nextId(),
          nodes: [{
            type: 'PARAGRAPH',
            id: nextId(),
            nodes: [textNode(nextId(), (m?.[1] ?? '').trim())],
          }],
        });
        i++;
      }
      nodes.push({ type: 'BULLETED_LIST', id: nextId(), nodes: items });
      continue;
    }
    // Blank line — skip
    if (line.trim() === '') { i++; continue; }
    // Paragraph — collect until blank line / heading / list
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
      paraLines.push(lines[i].replace(/\r$/, '').trim());
      i++;
    }
    nodes.push({
      type: 'PARAGRAPH',
      id: nextId(),
      nodes: [textNode(nextId(), paraLines.join(' '))],
    });
  }
  return { nodes };
}

function textNode(id: string, text: string) {
  return { type: 'TEXT', id, textData: { text, decorations: [] } };
}

async function wixFetch(path: string, opts: { apiKey: string; accountId?: string | null; siteId: string; method?: string; body?: unknown }) {
  const headers: Record<string, string> = {
    'Authorization': opts.apiKey,
    'wix-site-id': opts.siteId,
    'Content-Type': 'application/json',
  };
  // wix-account-id is only required for OAuth-style auth. With a fine-grained
  // API key the account is implicit in the key, so the header is optional.
  if (opts.accountId) headers['wix-account-id'] = opts.accountId;

  const res = await fetch(`https://www.wixapis.com${path}`, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const wixApiKey = Deno.env.get('WIX_API_KEY');
  const wixAccountId = Deno.env.get('WIX_ACCOUNT_ID') ?? null; // optional with API key auth
  const wixSiteId = Deno.env.get('WIX_SITE_ID');
  if (!supabaseUrl || !supabaseServiceKey) return json(500, { ok: false, error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  if (!wixApiKey || !wixSiteId) return json(500, { ok: false, error: 'Server missing WIX_API_KEY or WIX_SITE_ID' });

  let body: RequestBody;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Invalid JSON body' }); }
  if (!body.draft_id) return json(400, { ok: false, error: 'draft_id is required' });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load the draft + config (for author memberId).
  const { data: draft, error: draftErr } = await supabase.from('blog_drafts').select('*').eq('id', body.draft_id).single();
  if (draftErr || !draft) return json(404, { ok: false, error: `Draft ${body.draft_id} not found` });

  const { data: config } = await supabase.from('ai_blogger_config').select('*').eq('id', 'default').single();
  const memberId = config?.wix_member_id ?? null;

  // Mark in-flight so the UI shows status='publishing'.
  await supabase.from('blog_drafts').update({ status: 'publishing', failure_reason: null }).eq('id', draft.id);

  const richContent = markdownToRicos(draft.body_md);

  // 1. Create a Wix draft post.
  const createRes = await wixFetch('/blog/v3/draft-posts', {
    apiKey: wixApiKey,
    accountId: wixAccountId,
    siteId: wixSiteId,
    method: 'POST',
    body: {
      draftPost: {
        title: draft.title,
        excerpt: draft.excerpt ?? undefined,
        memberId: memberId ?? undefined,
        richContent,
        seoData: draft.target_keywords && draft.target_keywords.length > 0
          ? { tags: [{ type: 'META_TAG', props: { name: 'keywords', content: draft.target_keywords.join(', ') } }] }
          : undefined,
      },
    },
  });
  if (!createRes.ok) {
    const reason = createRes.data?.message ?? createRes.data?.details?.[0]?.description ?? `Wix create returned HTTP ${createRes.status}`;
    await supabase.from('blog_drafts').update({ status: 'failed', failure_reason: reason }).eq('id', draft.id);
    return json(createRes.status, { ok: false, error: reason });
  }

  const wixDraftId = createRes.data?.draftPost?.id;
  if (!wixDraftId) {
    const reason = 'Wix did not return a draft post id.';
    await supabase.from('blog_drafts').update({ status: 'failed', failure_reason: reason }).eq('id', draft.id);
    return json(502, { ok: false, error: reason });
  }

  // 2. Publish that draft post.
  const publishRes = await wixFetch(`/blog/v3/draft-posts/${wixDraftId}/publish`, {
    apiKey: wixApiKey,
    accountId: wixAccountId,
    siteId: wixSiteId,
    method: 'POST',
    body: {},
  });
  if (!publishRes.ok) {
    const reason = publishRes.data?.message ?? `Wix publish returned HTTP ${publishRes.status}`;
    await supabase.from('blog_drafts').update({ status: 'failed', failure_reason: reason }).eq('id', draft.id);
    return json(publishRes.status, { ok: false, error: reason });
  }

  // Wix's publish response shape: { post: { id, url: { base, path }, ... } }
  const post = publishRes.data?.post ?? {};
  const wixPostId: string | null = post.id ?? null;
  const wixUrl: string | null = post.url
    ? (typeof post.url === 'string' ? post.url : `${post.url.base ?? ''}${post.url.path ?? ''}`)
    : null;

  const { data: updated, error: updErr } = await supabase
    .from('blog_drafts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      wix_post_id: wixPostId,
      wix_post_url: wixUrl,
      failure_reason: null,
    })
    .eq('id', draft.id)
    .select()
    .single();
  if (updErr) return json(500, { ok: false, error: `DB update after publish failed: ${updErr.message}` });

  return json(200, { ok: true, draft: updated });
});
