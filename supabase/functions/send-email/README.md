# send-email

Generic email Edge Function backed by [Resend](https://resend.com).

Called from each feature's `email/api.ts` send module (Quotation, Invoice, PO,
Delivery Order). The caller is responsible for:

1. Rendering the PDF with `@react-pdf/renderer` → Blob.
2. Uploading the Blob to the public `attachments` Storage bucket and getting the
   `publicUrl`.
3. Calling `renderEmailHtml(design, profile, ctx)` from `@/features/email-designs`
   to produce the routed envelope (from / replyTo / cc / bcc / subject / html).
4. Invoking this function with `{ from, to, replyTo, cc, bcc, subject, html,
   attachmentUrl, attachmentName }`.

## Required secret

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

The sender domain in `from` must be verified in the Resend dashboard, otherwise
Resend will reject with 422.

## Response

```json
{ "ok": true, "id": "<resend message id>" }
```

or

```json
{ "ok": false, "error": "<friendly message>" }
```
