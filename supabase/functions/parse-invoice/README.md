# `parse-invoice`

Parses a vendor invoice via the Anthropic Messages API. The Bills modal uses
this to auto-fill the form fields when a user drops an invoice file.

## Required secret

Set in **Supabase Dashboard → Edge Functions → parse-invoice → Secrets**:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic API key from console.anthropic.com. Model used: `claude-sonnet-4-6`. The key is **per-function** in Supabase, so you must set it on this function even if the same key is already configured on `ai-blogger-draft`. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — no need to
set those.

## Request shape

```jsonc
POST /functions/v1/parse-invoice
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "file_base64": "JVBERi0xLjQK...",      // base64-encoded file bytes (no data: prefix)
  "mime":        "application/pdf",       // application/pdf | image/png | image/jpeg
  "filename":    "vendor-invoice.pdf",    // optional, included in the prompt as context
  "categories":  ["Rent","Utilities",…]   // optional whitelist — when present, the
                                          //   model picks one for the `category` field;
                                          //   server validates against this list and
                                          //   nulls hallucinations. Expenses passes
                                          //   EXPENSE_CATEGORIES; Bills currently does not.
}
```

## Response

```jsonc
{
  "ok": true,
  "fields": {
    "amount":      1234.50,
    "tax":         88.92,
    "currency":    "RM",                   // RM / CNY / SGD / USD
    "bill_date":   "2026-05-14",
    "due_date":    "2026-06-13",
    "reference":   "INV-2026-0042",
    "vendor_name": "ABB Malaysia Sdn. Bhd.",
    "category":    "Utilities"             // null if no `categories` whitelist sent
                                           //   or the model couldn't pick confidently
  }
}
```

Any field the model can't confidently extract comes back as `null`. The client
does fuzzy supplier-matching against the existing `suppliers` list using
`vendor_name`.

## Notes

- File limits: PDFs up to ~30 pages / images up to ~5 MB (Anthropic API limits).
- The browser caller base64-encodes the file with `FileReader.readAsDataURL`
  and strips the `data:...;base64,` prefix before sending.
- Cost per call (sonnet-4-6 at typical invoice size): ~$0.003–0.01.
