# `send-whatsapp-quote`

Proxies a quotation send to the Respond.io API v2. The browser cannot call
Respond.io directly because the API does not expose CORS headers, so this
function holds the bearer token server-side.

## Required secrets

Set these in **Supabase dashboard → Edge Functions → send-whatsapp-quote → Secrets**
(MCP cannot manage function secrets, so this step is manual):

| Name | Value |
|---|---|
| `RESPOND_IO_API_KEY` | Workspace bearer token from Respond.io → Workspace Settings → Integrations → Developer API → "Add Access Token" |
| `RESPOND_IO_CHANNEL_ID` | The WhatsApp channel ID from Respond.io. Find it in Settings → Channels → click the WhatsApp channel → channel ID is in the URL or the channel detail panel |

## Request shape

```jsonc
POST /functions/v1/send-whatsapp-quote
Content-Type: application/json
Authorization: Bearer <SUPABASE_ANON_KEY>

{
  "phone":    "+60123456789",
  "name":     "Customer Name",
  "caption":  "Hi! Please find your quotation attached.",
  "pdfUrl":   "https://<project>.supabase.co/storage/v1/object/public/attachments/quotes/Q-2026-001/whatsapp-1715000000.pdf",
  "fileName": "Quotation-Q-2026-001.pdf"
}
```

Response on success: `{ "ok": true, "contactId": "...", "messageId": "..." }`.
Response on failure: `{ "ok": false, "error": "human-readable message" }` with
the original Respond.io status code preserved.

## Behavior

1. Upserts a Respond.io contact via `POST /v2/contacts` (de-duped on `phoneNumber`).
2. Sends a multi-part `/v2/messages` containing a `text` part (the caption)
   followed by an `attachment` part referencing the PDF by URL.

## 24-hour window

WhatsApp Cloud API allows free-form messages only within 24 hours of the
customer's last inbound message. Outside that window only approved templates
work — the function detects this in Respond.io's error response and surfaces
a friendly message: "WhatsApp 24-hour window expired — customer must message
you first." Template support is not implemented in v1.

## Smoke test

```bash
curl -X POST "https://<project>.functions.supabase.co/send-whatsapp-quote" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+60123456789",
    "name":  "Smoke Test",
    "caption": "Test caption from curl",
    "pdfUrl": "https://www.africau.edu/images/default/sample.pdf",
    "fileName": "sample.pdf"
  }'
```
