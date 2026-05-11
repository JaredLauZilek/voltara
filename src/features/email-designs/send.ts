import { supabase } from '@/shared/lib/supabase';
import { renderEmailHtml } from './render';
import type { CompanyEmailProfile, EmailDesign, PlaceholderContext } from './types';

const BUCKET = 'attachments';

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

  const rendered = renderEmailHtml({
    design: args.design,
    profile: args.profile,
    ctx: args.ctx,
    brandColor: args.brandColor,
    logoDataUrl: args.logoDataUrl,
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
