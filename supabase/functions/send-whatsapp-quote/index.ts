// Supabase Edge Function — proxies a "send quotation via WhatsApp" call to the
// Respond.io API v2. Browser code can't call Respond.io directly because the
// API doesn't expose CORS, so this function holds the bearer key server-side
// and forwards the request.

// deno-lint-ignore-file no-explicit-any

interface RequestBody {
  phone: string;       // E.164, e.g. "+60123456789"
  name: string;        // customer display name
  caption: string;     // free-form text body
  pdfUrl: string;      // publicly-reachable URL of the PDF
  fileName: string;    // e.g. "Quotation-Q-2026-001.pdf"
}

const RESPOND_BASE = 'https://api.respond.io/v2';

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

async function respondFetch(path: string, apiKey: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(`${RESPOND_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* non-JSON response */ }
  return { status: res.status, data };
}

/** Maps a Respond.io error response into a user-friendly message. */
function friendlyError(status: number, data: any): string {
  const raw = data?.message ?? data?.error ?? '';
  const lower = String(raw).toLowerCase();
  // WhatsApp's 24-hour service window — Respond.io surfaces this with phrases
  // like "outside 24 hour", "session expired", or "template required".
  if (
    lower.includes('24') ||
    lower.includes('session') ||
    lower.includes('template') ||
    lower.includes('window')
  ) {
    return 'WhatsApp 24-hour window expired — customer must message you first.';
  }
  if (status === 401 || status === 403) return 'Respond.io rejected the API key. Check the function secrets.';
  if (status === 429) return 'Respond.io rate limit hit. Try again in a minute.';
  return raw || `Respond.io returned HTTP ${status}.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const apiKey = Deno.env.get('RESPOND_IO_API_KEY');
  const channelId = Deno.env.get('RESPOND_IO_CHANNEL_ID');
  if (!apiKey || !channelId) {
    return json(500, { ok: false, error: 'Server missing RESPOND_IO_API_KEY or RESPOND_IO_CHANNEL_ID' });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body' });
  }

  const { phone, name, caption, pdfUrl, fileName } = body;
  if (!phone || !caption || !pdfUrl || !fileName) {
    return json(400, { ok: false, error: 'Missing one of: phone, caption, pdfUrl, fileName' });
  }

  // 1. Upsert contact by phone — Respond.io de-dupes on phoneNumber.
  const contactRes = await respondFetch('/contacts', apiKey, {
    phoneNumber: phone,
    name: name || phone,
  });
  // 2xx = created; 409/422 sometimes mean "exists" — Respond.io's response
  // shape is forgiving and returns the existing id either way. Anything else
  // is a hard failure.
  if (contactRes.status >= 400 && contactRes.status !== 409 && contactRes.status !== 422) {
    return json(contactRes.status, { ok: false, error: friendlyError(contactRes.status, contactRes.data) });
  }
  const contactId = contactRes.data?.data?.id ?? contactRes.data?.id;
  if (!contactId) {
    return json(502, { ok: false, error: 'Respond.io did not return a contact id.' });
  }

  // 2. Send caption + PDF as a single multi-part message.
  const messageRes = await respondFetch('/messages', apiKey, {
    contactId,
    channelId,
    message: [
      { type: 'text', text: caption },
      {
        type: 'attachment',
        attachment: {
          type: 'file',
          url: pdfUrl,
          mimeType: 'application/pdf',
          fileName,
        },
      },
    ],
  });
  if (messageRes.status >= 400) {
    return json(messageRes.status, { ok: false, error: friendlyError(messageRes.status, messageRes.data) });
  }

  const messageId = messageRes.data?.data?.id ?? messageRes.data?.id ?? null;
  return json(200, { ok: true, contactId, messageId });
});
