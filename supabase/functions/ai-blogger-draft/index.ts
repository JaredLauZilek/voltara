// Supabase Edge Function — drafts a blog post via the Anthropic API.
// Reads competitor + keyword + config context from the database, sends one
// prompt to Claude, parses the structured JSON response, inserts a row in
// `blog_drafts`, and returns it.

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';

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

interface RequestBody {
  topic?: string;
  keyword_ids?: string[];
  competitor_ids?: string[];
}

const SYSTEM_PROMPT = `You are an expert SEO content writer for a Malaysian EV-charging-infrastructure company.
You write blog posts that are useful, specific, and avoid generic filler.

Output strict JSON matching this schema, nothing else:
{
  "title": string,                  // <= 80 chars, scannable, no clickbait
  "slug": string,                   // kebab-case, derived from title
  "excerpt": string,                // 1-2 sentence summary, <= 180 chars
  "body_md": string,                // Markdown body, 800-1400 words, with H2/H3 sections, bullet lists, and a closing CTA
  "target_keywords": string[]       // 3-7 keywords this post is meant to rank for
}

Do not wrap the JSON in code fences. Do not include any prose outside the JSON object.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!supabaseUrl || !supabaseServiceKey) return json(500, { ok: false, error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  if (!anthropicKey) return json(500, { ok: false, error: 'Server missing ANTHROPIC_API_KEY' });

  let body: RequestBody;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Invalid JSON body' }); }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Pull config + selected competitors + selected keywords for context.
  const [{ data: config }, { data: competitors }, { data: keywords }] = await Promise.all([
    supabase.from('ai_blogger_config').select('*').eq('id', 'default').single(),
    body.competitor_ids?.length
      ? supabase.from('blog_competitors').select('*').in('id', body.competitor_ids)
      : supabase.from('blog_competitors').select('*'),
    body.keyword_ids?.length
      ? supabase.from('blog_keywords').select('*').in('id', body.keyword_ids)
      : supabase.from('blog_keywords').select('*').order('priority', { ascending: false }).limit(10),
  ]);

  // Build the user-side prompt.
  const sections: string[] = [];
  if (config?.brand_voice) sections.push(`BRAND VOICE: ${config.brand_voice}`);
  if (config?.target_audience) sections.push(`TARGET AUDIENCE: ${config.target_audience}`);
  if (competitors && competitors.length > 0) {
    sections.push(
      `COMPETITORS WE TRACK (for differentiation, do not copy their angle):\n` +
        competitors.map((c: any) => `- ${c.name}${c.website ? ` (${c.website})` : ''}${c.notes ? ` — ${c.notes}` : ''}`).join('\n')
    );
  }
  if (keywords && keywords.length > 0) {
    sections.push(`TARGET KEYWORDS (weave in naturally):\n` + keywords.map((k: any) => `- ${k.keyword}${k.intent ? ` (${k.intent})` : ''}`).join('\n'));
  }
  if (body.topic) {
    sections.push(`TOPIC / ANGLE: ${body.topic}`);
  } else {
    sections.push(`TOPIC: Pick an under-served, high-intent angle relevant to our target audience that the listed competitors haven't covered well.`);
  }
  sections.push(`Write the post now. Return only the JSON object.`);

  const userPrompt = sections.join('\n\n');

  // Call Anthropic.
  let anthropicData: any;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    anthropicData = await res.json();
    if (!res.ok) {
      return json(res.status, { ok: false, error: anthropicData?.error?.message ?? `Anthropic returned HTTP ${res.status}` });
    }
  } catch (e) {
    return json(502, { ok: false, error: `Anthropic call failed: ${(e as Error).message}` });
  }

  // Parse the model's JSON response.
  const text = (anthropicData?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
  let parsed: any;
  try {
    // Strip optional code fences just in case.
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return json(502, { ok: false, error: 'Could not parse model output as JSON.' });
  }

  if (!parsed.title || !parsed.body_md) {
    return json(502, { ok: false, error: 'Model output missing title or body.' });
  }

  // Insert into blog_drafts.
  const draftId = `BLOG-${Date.now().toString(36).toUpperCase()}`;
  const { data: inserted, error: insertErr } = await supabase
    .from('blog_drafts')
    .insert({
      id: draftId,
      title: String(parsed.title).slice(0, 200),
      slug: parsed.slug ? String(parsed.slug).slice(0, 200) : null,
      body_md: String(parsed.body_md),
      excerpt: parsed.excerpt ? String(parsed.excerpt) : null,
      target_keywords: Array.isArray(parsed.target_keywords) ? parsed.target_keywords.map(String) : [],
      competitor_refs: body.competitor_ids ?? [],
      status: 'draft',
      generated_at: new Date().toISOString(),
      generated_model: ANTHROPIC_MODEL,
    })
    .select()
    .single();
  if (insertErr) return json(500, { ok: false, error: `DB insert failed: ${insertErr.message}` });

  return json(200, { ok: true, draft: inserted });
});
