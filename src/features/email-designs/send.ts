import { supabase } from '@/shared/lib/supabase';
import { renderEmailHtml } from './render';
import type { CompanyEmailProfile, EmailDesign, PlaceholderContext } from './types';

const BUCKET = 'attachments';

/**
 * Email clients (Gmail, Outlook, etc.) strip `data:` URIs in `<img>` tags for
 * security, so a base64-encoded logo from company_profile.logo_data_url shows
 * as a broken image in the recipient's inbox. Upload the logo to Storage once
 * and return its public `https://` URL so the email renderer can embed it
 * normally. Pass-through for already-hosted URLs and null.
 */
async function hostedLogoUrl(logoDataUrl: string | null | undefined): Promise<string | null> {
  if (!logoDataUrl) return null;
  if (!logoDataUrl.startsWith('data:')) return logoDataUrl;

  const match = logoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const ext = (mime.split('/')[1] ?? 'png').replace(/[^a-z0-9]/gi, '');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // Fixed path + upsert means the latest company logo always overwrites the
  // previous one — no orphaned files accumulate across logo changes.
  const path = `branding/company-default-logo.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true });
  if (upErr) {
    // Non-fatal — fall back to no logo rather than blocking the send.
    console.warn('[email] could not host logo:', upErr.message);
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface SendDocEmailArgs {
  to: string;
  /** Optional override of the rendered subject — used when the user edits it in the modal. */
  subjectOverride?: string;
  design: EmailDesign;
  profile: CompanyEmailProfile;
  ctx: PlaceholderContext;
  brandColor?: string;
  logoDataUrl?: string | null;
  /** Lazy because rendering the PDF is expensive. Skipped when design.attach_pdf is false. */
  buildPdfBlob: () => Promise<Blob>;
  pdfFileName: string;
  /** Storage path prefix — e.g. `quotes/Q-2026-001/email-`. A timestamp + `.pdf` is appended. */
  storagePathPrefix: string;
}

export interface SendDocEmailResult {
  id: string | null;
  attachmentUrl: string | null;
}

/**
 * Mirrors the WhatsApp send pipeline (render PDF → upload to Storage → invoke
 * Edge Function with metadata). Used by every per-doctype email/api.ts module.
 *
 * Throws Error(message) on failure so the caller can render a banner.
 */
export async function sendDocEmail(args: SendDocEmailArgs): Promise<SendDocEmailResult> {
  if (!args.to.trim()) throw new Error('Recipient email is required.');

  const hostedLogo = await hostedLogoUrl(args.logoDataUrl);

  const rendered = renderEmailHtml({
    design: args.design,
    profile: args.profile,
    ctx: args.ctx,
    brandColor: args.brandColor,
    logoDataUrl: hostedLogo,
  });

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  if (args.design.attach_pdf) {
    const blob = await args.buildPdfBlob();
    const ts = Date.now();
    const path = `${args.storagePathPrefix}${ts}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw new Error(`Could not upload PDF: ${upErr.message}`);
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    attachmentUrl = urlData.publicUrl;
    attachmentName = args.pdfFileName;
  }

  const { data, error } = await supabase.functions.invoke<{ ok: boolean; id?: string; error?: string }>(
    'send-email',
    {
      body: {
        from: rendered.from,
        to: args.to.trim(),
        replyTo: rendered.replyTo,
        cc: rendered.cc,
        bcc: rendered.bcc,
        subject: args.subjectOverride?.trim() || rendered.subject,
        html: rendered.html,
        attachmentUrl,
        attachmentName,
      },
    },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? 'Send failed.');

  return { id: data.id ?? null, attachmentUrl };
}
