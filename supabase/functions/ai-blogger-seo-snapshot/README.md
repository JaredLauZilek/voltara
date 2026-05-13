# `ai-blogger-seo-snapshot`

Pulls a fresh Ahrefs snapshot for a published blog post's URL and writes it as a row in `blog_seo_snapshots`. Stored as raw JSON in `metrics` so we can add charts later without backfilling.

## Required secrets

| Name | Value |
|---|---|
| `AHREFS_API_KEY` | Ahrefs v3 API token. Generate at https://app.ahrefs.com/api → Manage tokens. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected.

## Metrics captured

For each call the function fetches in parallel:
- **organic_keywords** — top 20 keywords the URL ranks for, by position
- **domain_rating** — DR for the URL
- **refdomains** — top 10 referring domains

Each piece is stored independently inside `metrics.<name>`. Partial failures don't block the snapshot — failed pieces are stored as `{ error: ... }`.

## Request shape

```jsonc
POST /functions/v1/ai-blogger-seo-snapshot
Authorization: Bearer <SUPABASE_ANON_KEY>

{ "draft_id": "BLOG-XXXX" }
```

The draft must have a `wix_post_url` already (i.e. the publish step ran first), otherwise the function returns 400.
