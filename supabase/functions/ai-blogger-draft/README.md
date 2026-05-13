# `ai-blogger-draft`

Drafts a blog post via the Anthropic API. Reads competitor / keyword / brand context from the DB, calls Claude, parses the JSON response, inserts a row in `blog_drafts`, and returns it.

## Required secrets

Set in **Supabase dashboard → Edge Functions → ai-blogger-draft → Secrets**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key (https://console.anthropic.com/settings/keys) — billed per token. Model used: `claude-sonnet-4-6`. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase.

## Request shape

```jsonc
POST /functions/v1/ai-blogger-draft
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "topic": "optional brief / angle",
  "keyword_ids": ["KW-...", "KW-..."],
  "competitor_ids": ["COMP-...", "COMP-..."]
}
```

Response: `{ "ok": true, "draft": <BlogDraft row> }`.

## Behaviour

The model is asked to return strict JSON with `title`, `slug`, `excerpt`, `body_md`, and `target_keywords`. If parsing fails, the function returns 502 with `error: "Could not parse model output as JSON"`. A row is inserted with `status: 'draft'`, `generated_at`, and `generated_model` set.
