// Supabase Edge Function — parses a vendor invoice via the Anthropic Messages
// API. Browser uploads the file as base64; we forward it to Claude with a
// document (PDF) or image (PNG/JPG) content block and a strict-JSON system
// prompt. The Bills + Expenses modals use the returned fields to pre-fill
// the form.
//
// Optional `categories` array tells the model to pick the best-fitting one
// from a whitelist (returns null when uncertain or omitted). Expenses passes
// EXPENSE_CATEGORIES; Bills currently does not, but could.

// deno-lint-ignore-file no-explicit-any

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
  file_base64: string;
  mime: string;
  filename?: string;
  /** Optional whitelist — when provided, the model returns one of these
   *  strings (or null) for the `category` field. */
  categories?: string[];
}

interface ExtractedFields {
  amount: number | null;
  tax: number | null;
  currency: 'RM' | 'CNY' | 'SGD' | 'USD' | null;
  bill_date: string | null;     // YYYY-MM-DD
  due_date: string | null;      // YYYY-MM-DD
  reference: string | null;
  vendor_name: string | null;
  category: string | null;
}

function buildSystemPrompt(categories: string[] | undefined): string {
  const categoryRule = categories && categories.length > 0
    ? `- "category" must be EXACTLY one of: ${categories.map((c) => `"${c}"`).join(', ')}. Pick the single best fit based on the invoice contents (vendor type, line items, descriptions). Return null if no category clearly applies.`
    : `- "category": return null (no whitelist provided).`;

  return `You are a precise invoice-parsing assistant. You are given a vendor invoice (PDF or image) and must extract a small set of structured fields.

Output ONLY a JSON object matching this schema, nothing else:
{
  "amount":     number | null,   // grand total / total payable / amount due (the final figure the buyer pays)
  "tax":        number | null,   // SST / GST / VAT line if present
  "currency":   "RM" | "CNY" | "SGD" | "USD" | null,
  "bill_date":  string | null,   // ISO YYYY-MM-DD (invoice issue date)
  "due_date":   string | null,   // ISO YYYY-MM-DD
  "reference":  string | null,   // vendor's invoice number / ref
  "vendor_name": string | null,  // company name issuing the invoice (NOT the recipient)
  "category":   string | null    // see category rule below
}

Rules:
- Return null when you are genuinely unsure. DO NOT guess.
- "amount" must be the final payable total, NOT the subtotal.
- "currency" must be one of the four ISO-like tokens above. If you see "MYR" → "RM". If "RMB" → "CNY". If a bare "$" with no other clue, return null.
- Dates: convert any human format (DD/MM/YYYY, "12 May 2026", etc.) to YYYY-MM-DD. Assume DD/MM order for ambiguous numeric dates (MY locale).
- "vendor_name" is the COMPANY THAT ISSUED the invoice (top of the page, with a logo or letterhead) — NOT the bill-to / recipient.
${categoryRule}
- No code fences, no prose, no commentary. JSON object only.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) return json(500, { ok: false, error: 'Server missing ANTHROPIC_API_KEY' });

  let body: RequestBody;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'Invalid JSON body' }); }
  if (!body.file_base64 || !body.mime) {
    return json(400, { ok: false, error: 'Missing file_base64 or mime' });
  }

  const isPdf = body.mime === 'application/pdf';
  const isImage = body.mime === 'image/png' || body.mime === 'image/jpeg' || body.mime === 'image/jpg';
  if (!isPdf && !isImage) {
    return json(400, { ok: false, error: `Unsupported mime type: ${body.mime}` });
  }

  const fileBlock: any = isPdf
    ? {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: body.file_base64 },
      }
    : {
        type: 'image',
        source: { type: 'base64', media_type: body.mime === 'image/jpg' ? 'image/jpeg' : body.mime, data: body.file_base64 },
      };

  const systemPrompt = buildSystemPrompt(body.categories);

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
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              fileBlock,
              { type: 'text', text: `Extract the fields from this invoice (filename: ${body.filename ?? 'unknown'}). Return only the JSON object.` },
            ],
          },
        ],
      }),
    });
    anthropicData = await res.json();
    if (!res.ok) {
      return json(res.status, { ok: false, error: anthropicData?.error?.message ?? `Anthropic returned HTTP ${res.status}` });
    }
  } catch (e) {
    return json(502, { ok: false, error: `Anthropic call failed: ${(e as Error).message}` });
  }

  const text = (anthropicData?.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();

  let parsed: ExtractedFields;
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return json(502, { ok: false, error: 'Model output was not valid JSON.' });
  }

  // Validate `category` against the whitelist — if the model hallucinated a
  // value outside the allowed list, treat it as null rather than passing
  // junk to the caller.
  const allowedCategories = body.categories ?? [];
  const safeCategory =
    typeof parsed.category === 'string' && allowedCategories.includes(parsed.category)
      ? parsed.category
      : null;

  const fields: ExtractedFields = {
    amount: typeof parsed.amount === 'number' && parsed.amount > 0 ? parsed.amount : null,
    tax: typeof parsed.tax === 'number' && parsed.tax >= 0 ? parsed.tax : null,
    currency: ['RM', 'CNY', 'SGD', 'USD'].includes(parsed.currency as string)
      ? (parsed.currency as ExtractedFields['currency'])
      : null,
    bill_date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.bill_date ?? '') ? parsed.bill_date : null,
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.due_date ?? '') ? parsed.due_date : null,
    reference: typeof parsed.reference === 'string' && parsed.reference.trim().length > 0 ? parsed.reference.trim() : null,
    vendor_name: typeof parsed.vendor_name === 'string' && parsed.vendor_name.trim().length > 0 ? parsed.vendor_name.trim() : null,
    category: safeCategory,
  };

  return json(200, { ok: true, fields });
});
