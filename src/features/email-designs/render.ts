import { substitutePlaceholders } from './placeholders';
import type { CompanyEmailProfile, EmailDesign, PlaceholderContext } from './types';

export interface RenderedEmail {
  subject: string;
  html: string;
  from: string;             // "Name <email@domain>"
  replyTo: string | null;
  cc: string | null;
  bcc: string | null;
}

export interface RenderArgs {
  design: EmailDesign;
  profile: CompanyEmailProfile;
  ctx: PlaceholderContext;
  /** Optional brand colour fallback from company_profile (form-designs). */
  brandColor?: string;
  /** Optional company logo data URL fallback from company_profile (form-designs). */
  logoDataUrl?: string | null;
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const nl2br = (s: string): string => escapeHtml(s).replace(/\n/g, '<br>');

const sub = (template: string | null | undefined, ctx: PlaceholderContext): string =>
  substitutePlaceholders(template, ctx);

function formatAddress(name: string, address: string): string {
  if (!address) return '';
  return `${name} <${address}>`;
}

export function renderEmailHtml({ design, profile, ctx, brandColor, logoDataUrl }: RenderArgs): RenderedEmail {
  const accent = design.accent_color || brandColor || '#1B512D';

  const fromName = (design.from_name || profile.default_from_name || ctx.company.name).trim();
  const fromAddr = (design.from_address || profile.default_from_address).trim();
  const replyTo = (design.reply_to ?? profile.default_reply_to) || null;
  const cc = (design.cc ?? profile.default_cc) || null;
  const bcc = (design.bcc ?? profile.default_bcc) || null;
  const signature = design.signature_text ?? profile.default_signature ?? '';

  const subject = sub(design.subject_template, ctx);
  const introHtml = nl2br(sub(design.intro_text, ctx));
  const bodyHtml = nl2br(sub(design.body_text, ctx));
  const signatureHtml = nl2br(sub(signature, ctx));
  const footerHtml = nl2br(sub(design.footer_text, ctx));

  const logoBlock = design.show_logo && logoDataUrl
    ? `<img src="${logoDataUrl}" alt="${escapeHtml(ctx.company.name)}" style="max-height:48px;display:block;margin:0 0 16px 0;">`
    : `<div style="font-size:18px;font-weight:700;color:${accent};margin:0 0 16px 0;">${escapeHtml(ctx.company.name)}</div>`;

  const ps = ctx.doc.payment_summary;
  const paymentRows = !ps
    ? ''
    : ps.kind === 'deposit'
      ? `<div style="font-size:13px;font-weight:600;color:#1a1a1a;margin-top:6px;">${ps.deposit_percent}% Deposit: ${escapeHtml(ps.deposit_amount)}</div>`
      : ps.kind === 'partial'
        ? `<div style="font-size:13px;font-weight:600;color:#1B512D;margin-top:6px;">Paid: ${escapeHtml(ps.paid)}</div>
           <div style="font-size:13px;font-weight:700;color:#C0321A;margin-top:2px;">Outstanding: ${escapeHtml(ps.outstanding)}</div>`
        : `<div style="font-size:13px;font-weight:700;color:#1B512D;margin-top:6px;">Paid in full: ${escapeHtml(ps.paid)}</div>`;

  const summaryBlock = design.show_doc_summary
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0 20px 0;background:#F9F9F9;border-radius:10px;">
        <tr>
          <td style="padding:14px 18px;font-family:Figtree,Helvetica,Arial,sans-serif;">
            <div style="font-size:11px;font-weight:700;color:#767B77;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(ctx.doc.kind)}</div>
            <div style="font-size:16px;font-weight:700;color:${accent};margin-top:2px;">${escapeHtml(ctx.doc.id)}</div>
            <div style="font-size:12px;color:#767B77;margin-top:4px;">Date: ${escapeHtml(ctx.doc.date)}</div>
            <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-top:8px;">Total: ${escapeHtml(ctx.doc.total)}</div>
            ${paymentRows}
          </td>
        </tr>
      </table>`
    : '';

  const introSection = introHtml
    ? `<p style="font-family:Figtree,Helvetica,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;margin:0 0 14px 0;">${introHtml}</p>`
    : '';

  const bodySection = bodyHtml
    ? `<p style="font-family:Figtree,Helvetica,Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5;margin:0 0 14px 0;">${bodyHtml}</p>`
    : '';

  const signatureSection = signatureHtml
    ? `<p style="font-family:Figtree,Helvetica,Arial,sans-serif;font-size:13px;color:#1a1a1a;line-height:1.5;margin:24px 0 0 0;">${signatureHtml}</p>`
    : '';

  const footerSection = footerHtml
    ? `<p style="font-family:Figtree,Helvetica,Arial,sans-serif;font-size:11px;color:#767B77;line-height:1.5;margin:28px 0 0 0;border-top:1px solid #EBEBEB;padding-top:14px;">${footerHtml}</p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F9F9F9;font-family:Figtree,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#F9F9F9;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid #EBEBEB;border-radius:16px;border-collapse:separate;">
          <tr>
            <td style="padding:28px;">
              ${logoBlock}
              ${introSection}
              ${summaryBlock}
              ${bodySection}
              ${signatureSection}
              ${footerSection}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject,
    html,
    from: formatAddress(fromName, fromAddr),
    replyTo,
    cc,
    bcc,
  };
}
