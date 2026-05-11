// Supabase Edge Function — sends an email via Resend.
// Browser code can't call Resend's REST API directly because the API key would
// be exposed. This function holds the RESEND_API_KEY server-side, fetches any
// referenced PDF attachment from a public Storage URL, base64-encodes it, and
// forwards everything to https://api.resend.com/emails.
//
// Required secret: RESEND_API_KEY  (set via `supabase secrets set` or dashboard)

// deno-lint-ignore-file no-explicit-any

interface RequestBody {
  from: string;             // "Voltara Sdn Bhd <quotes@voltara.com.my>"
  to: string;               // single recipient address
  replyTo?: string | null;
  cc?: string | null;
  bcc?: string | null;
  subject: string;
  html: string;
  /** Public URL of the PDF in Supabase Storage. Optional — text-only emails skip this. */
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

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

function splitCsv(value: string | null | undefined): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch attachment (HTTP ${res.status}).`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // Encode in 32 KB chunks to avoid argument-count limits on btoa.
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function friendlyResendError(status: number, data: any): string {
  const raw = data?.message ?? data?.error ?? '';
  if (status === 401 || status === 403) return 'Resend rejected the API key. Check the RESEND_API_KEY secret.';
  if (status === 422 && /domain/i.test(String(raw))) return `Resend: ${raw}. Verify the sender domain in the Resend dashboard.`;
  if (status === 429) return 'Resend rate limit hit. Try again in a minute.';
  return raw || `Resend returned HTTP ${status}.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    return json(500, { ok: false, error: 'Server missing RESEND_API_KEY secret.' });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { from, to, replyTo, cc, bcc, subject, html, attachmentUrl, attachmentName } = body;
  if (!from || !to || !subject || !html) {
    return json(400, { ok: false, error: 'Missing one of: from, to, subject, html' });
  }

  // Optional PDF attachment — fetch from the public Storage URL and base64-encode.
  let attachments: Array<{ filename: string; content: string }> | undefined;
  if (attachmentUrl) {
    try {
      const content = await fetchAsBase64(attachmentUrl);
      attachments = [{ filename: attachmentName || 'attachment.pdf', content }];
    } catch (e) {
      return json(502, { ok: false, error: (e as Error).message });
    }
  }

  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject,
    html,
  };
  const replyToList = splitCsv(replyTo);
  if (replyToList) payload.reply_to = replyToList;
  const ccList = splitCsv(cc);
  if (ccList) payload.cc = ccList;
  const bccList = splitCsv(bcc);
  if (bccList) payload.bcc = bccList;
  if (attachments) payload.attachments = attachments;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }

  if (res.status >= 400) {
    return json(res.status, { ok: false, error: friendlyResendError(res.status, data) });
  }

  return json(200, { ok: true, id: data?.id ?? null });
});
