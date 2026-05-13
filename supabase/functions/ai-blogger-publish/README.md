# `ai-blogger-publish`

Publishes a `blog_drafts` row to Wix Blog v3. Converts Markdown to a minimal Ricos document, creates a Wix draft post, then publishes it. Stamps the row with `wix_post_id`, `wix_post_url`, and `status='published'` (or `'failed'` with `failure_reason` on error).

## Required secrets

Set in **Supabase dashboard → Edge Functions → ai-blogger-publish → Secrets**:

| Name | Required? | Value |
|---|---|---|
| `WIX_API_KEY` | **Required** | Fine-grained Wix API key with **Blog write** scope. Generate at https://www.wix.com/my-account/api-keys |
| `WIX_SITE_ID` | **Required** | Wix site ID of the site to publish to. Find in the site's dashboard URL: `manage.wix.com/dashboard/<SITE_ID>/...` |
| `WIX_ACCOUNT_ID` | Optional | Only needed for OAuth-style auth. With a fine-grained API key the account is implicit in the key, so this can be left unset. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected. The author's `WIX_MEMBER_ID` is stored per-config in the `ai_blogger_config` table (Settings tab).

## Wix prerequisites

The target Wix site must have **Wix Blog** installed. Publishing fails with a 4xx if the Blog app isn't on the site.

## Markdown → Ricos conversion

v1 supports:
- `#`/`##`/`###` headings → HEADING nodes
- `-` / `*` bulleted lists → BULLETED_LIST + LIST_ITEM
- Blank-line-separated paragraphs → PARAGRAPH

Inline emphasis (bold, italic, links) is kept as plain text in v1. Bump the converter when needed.

## Request shape

```jsonc
POST /functions/v1/ai-blogger-publish
Authorization: Bearer <SUPABASE_ANON_KEY>

{ "draft_id": "BLOG-XXXX" }
```

Response on success: `{ "ok": true, "draft": <updated BlogDraft row> }`.
