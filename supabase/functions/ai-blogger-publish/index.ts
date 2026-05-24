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
//   - a standalone `---` / `***` / `___` line becomes a DIVIDER
// Inline markdown supported: `**bold**`, `*italic*` / `_italic_`,
// `[label](href)`. Anything fancier is preserved as plain text.
//
// `title` is the draft's post title. If the body starts with an H1 whose text
// matches the title (Anthropic almost always emits one), we drop it so the
// post doesn't show the heading twice — Wix renders the post title above the
// body already.
function markdownToRicos(md: string, title: string) {
  const lines = md.split('\n');
  const nodes: any[] = [];
  let counter = 0;
  const nextId = () => `n${++counter}`;
  const normalizedTitle = title.trim().toLowerCase();

  let i = 0;
  // Skip leading blank lines + an optional leading H1 that duplicates the title.
  while (i < lines.length && lines[i].trim() === '') i++;
  if (i < lines.length) {
    const leadH1 = lines[i].match(/^#\s+(.+)$/);
    if (leadH1 && leadH1[1].trim().toLowerCase() === normalizedTitle) {
      i++;
      while (i < lines.length && lines[i].trim() === '') i++;
    }
  }
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.replace(/\r$/, '');

    // GitHub-flavoured markdown table. Pattern:
    //   | h1 | h2 |
    //   |----|----|
    //   | a  | b  |
    //   | c  | d  |
    // We don't render a Ricos TABLE (the schema is fragile + rendering on
    // mobile is awkward) — instead emit a label-value bulleted list. The
    // first column becomes the bold label of each list item, remaining cells
    // are joined with ` · `.
    if (
      i + 1 < lines.length &&
      /^\s*\|.+\|\s*$/.test(line) &&
      /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      const splitRow = (l: string) =>
        l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      const header = splitRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      if (rows.length > 0) {
        // Header as an italic intro paragraph so readers know what the labels mean.
        const headerText = header.join(' · ');
        nodes.push({
          type: 'PARAGRAPH',
          id: nextId(),
          nodes: parseInline(`_${headerText}_`, nextId, '#000000'),
        });
        nodes.push({
          type: 'BULLETED_LIST',
          id: nextId(),
          nodes: rows.map((cells) => {
            const label = cells[0] ?? '';
            const rest = cells.slice(1).join(' · ');
            const itemMd = rest ? `**${label}** — ${rest}` : `**${label}**`;
            return {
              type: 'LIST_ITEM',
              id: nextId(),
              nodes: [{
                type: 'PARAGRAPH',
                id: nextId(),
                nodes: parseInline(itemMd, nextId, '#000000'),
              }],
            };
          }),
        });
        continue;
      }
      // Header looked table-ish but had no data rows — fall through and treat
      // as a plain paragraph.
    }

    // Horizontal rule — must be checked before bulleted-list because `***`
    // and `---` both start with the bullet-marker characters.
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      nodes.push({
        type: 'DIVIDER',
        id: nextId(),
        dividerData: { lineStyle: 'SINGLE', width: 'LARGE', alignment: 'CENTER' },
      });
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = Math.min(hMatch[1].length, 6);
      nodes.push({
        type: 'HEADING',
        id: nextId(),
        headingData: { level },
        // Headings keep the blog theme's heading colour — no COLOR decoration.
        nodes: parseInline(hMatch[2].trim(), nextId, null),
      });
      i++;
      continue;
    }
    // Bulleted list (collect contiguous items). Require a SPACE after the
    // bullet marker so `---` is never mis-parsed as a list item.
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
            // Body inside list items uses the same black colour as paragraphs.
            nodes: parseInline((m?.[1] ?? '').trim(), nextId, '#000000'),
          }],
        });
        i++;
      }
      nodes.push({ type: 'BULLETED_LIST', id: nextId(), nodes: items });
      continue;
    }
    // Ordered list — `1. foo`, `2. bar`, … Captured the same way as bulleted
    // lists but emits an ORDERED_LIST node so Wix renders numbers.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: any[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const m = lines[i].match(/^\s*\d+\.\s+(.+)$/);
        items.push({
          type: 'LIST_ITEM',
          id: nextId(),
          nodes: [{
            type: 'PARAGRAPH',
            id: nextId(),
            nodes: parseInline((m?.[1] ?? '').trim(), nextId, '#000000'),
          }],
        });
        i++;
      }
      nodes.push({ type: 'ORDERED_LIST', id: nextId(), nodes: items });
      continue;
    }
    // Blank line — skip
    if (line.trim() === '') { i++; continue; }
    // Paragraph — collect until blank line / heading / list / divider / table
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6}\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i]) &&
      !/^\s*\|.+\|\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i].replace(/\r$/, '').trim());
      i++;
    }
    nodes.push({
      type: 'PARAGRAPH',
      id: nextId(),
      nodes: parseInline(paraLines.join(' '), nextId, '#000000'),
    });
  }
  return { nodes };
}

// Inline markdown tokenizer. Returns an array of Ricos TEXT nodes, splitting
// the input into runs that share the same decoration set (bold / italic /
// link). Pass `color` to pin every emitted node to a specific foreground; pass
// `null` to leave the theme colour in place (used for headings).
function parseInline(text: string, nextId: () => string, color: string | null): any[] {
  type Run = { text: string; bold: boolean; italic: boolean; link?: string };
  const runs: Run[] = [];
  let buf = '';
  let bold = false;
  let italic = false;
  let i = 0;
  const flush = (link?: string) => {
    if (buf) runs.push({ text: buf, bold, italic, link });
    buf = '';
  };

  while (i < text.length) {
    // Bold: **…**
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        bold = true;
        buf = text.slice(i + 2, end);
        flush();
        bold = false;
        i = end + 2;
        continue;
      }
    }
    // Italic: *…*  (avoid the ** case handled above)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1);
      if (end > i + 1) {
        flush();
        italic = true;
        buf = text.slice(i + 1, end);
        flush();
        italic = false;
        i = end + 1;
        continue;
      }
    }
    // Italic via underscore: _…_
    if (text[i] === '_') {
      const end = text.indexOf('_', i + 1);
      if (end > i + 1) {
        flush();
        italic = true;
        buf = text.slice(i + 1, end);
        flush();
        italic = false;
        i = end + 1;
        continue;
      }
    }
    // Link: [label](href)
    if (text[i] === '[') {
      const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        flush();
        buf = linkMatch[1];
        flush(linkMatch[2]);
        i += linkMatch[0].length;
        continue;
      }
    }
    buf += text[i];
    i++;
  }
  flush();

  if (runs.length === 0) {
    runs.push({ text: '', bold: false, italic: false });
  }

  return runs.map((r) => {
    const decorations: any[] = [];
    if (color) decorations.push({ type: 'COLOR', colorData: { foreground: color } });
    if (r.bold) decorations.push({ type: 'BOLD', fontWeightValue: 700 });
    if (r.italic) decorations.push({ type: 'ITALIC', italicData: true });
    if (r.link) decorations.push({ type: 'LINK', linkData: { link: { url: r.link, target: 'BLANK' } } });
    return { type: 'TEXT', id: nextId(), textData: { text: r.text, decorations } };
  });
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
  // Featured / cover image. Prefer the draft's own override; fall back to the
  // global default in ai_blogger_config so every post still has *something*.
  // Wix Blog v3 accepts an external URL via media.embedMedia.thumbnail.url.
  const coverImageUrl: string | null =
    draft.cover_image_url ?? config?.default_cover_image_url ?? null;

  // Mark in-flight so the UI shows status='publishing'.
  await supabase.from('blog_drafts').update({ status: 'publishing', failure_reason: null }).eq('id', draft.id);

  const richContent = markdownToRicos(draft.body_md, draft.title ?? '');

  // Insert the featured image as the FIRST node in richContent so it renders
  // as a hero image right under the post title — matching how Wix Blog shows
  // an inline cover on dedicated posts (the `media.embedMedia` cover only
  // shows on the blog listing, not at the top of the post itself).
  if (coverImageUrl) {
    richContent.nodes.unshift({
      type: 'IMAGE',
      id: `cover-${Date.now()}`,
      imageData: {
        image: { src: { url: coverImageUrl } },
        altText: draft.title ?? '',
        containerData: { alignment: 'CENTER', width: { size: 'CONTENT' } },
      },
    });
  }

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
        media: coverImageUrl
          ? {
              embedMedia: { thumbnail: { url: coverImageUrl } },
              displayed: true,
              custom: true,
            }
          : undefined,
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
