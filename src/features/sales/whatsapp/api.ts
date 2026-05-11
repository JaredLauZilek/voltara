import { createElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/shared/lib/supabase';
import { pdfFilename } from '@/shared/lib/format';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Customer } from '@/features/customers';
import type { Product } from '@/features/products';
import type { SalesManager } from '@/features/sales-managers';
import { QuotePdf } from '../pdf/QuotePdf';
import type { Quote } from '../types';

const BUCKET = 'attachments';

export interface SendQuoteArgs {
  quote: Quote;
  customer: Customer;
  products: Product[];
  salesManager: SalesManager | null;
  profile: CompanyProfile;
  design: FormDesign;
  caption: string;
}

export interface SendQuoteResult {
  contactId: string;
  messageId: string | null;
  pdfUrl: string;
}

/**
 * 1. Render the quotation PDF into a Blob.
 * 2. Upload it to the existing public 'attachments' bucket so Respond.io can
 *    fetch it by URL.
 * 3. Invoke the send-whatsapp-quote Edge Function (which forwards to
 *    Respond.io with the server-side bearer token).
 *
 * Throws Error(message) on failure so callers can render a banner.
 */
export async function sendQuoteViaWhatsApp(args: SendQuoteArgs): Promise<SendQuoteResult> {
  if (!args.customer.phone) throw new Error('Customer has no phone on file.');

  // 1. Render PDF
  const blob = await pdf(
    createElement(QuotePdf, {
      quote: args.quote,
      customer: args.customer,
      products: args.products,
      salesManager: args.salesManager,
      profile: args.profile,
      design: args.design,
    })
  ).toBlob();

  // 2. Upload to Storage. upsert:true so re-sends overwrite the same path.
  const ts = Date.now();
  const safeId = args.quote.id.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `quotes/${safeId}/whatsapp-${ts}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'application/pdf', upsert: true });
  if (upErr) throw new Error(`Could not upload PDF: ${upErr.message}`);
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const pdfUrl = urlData.publicUrl;

  // 3. Invoke the Edge Function. supabase.functions.invoke handles the
  //    project URL + anon-key bearer header for us.
  const fileName = pdfFilename(args.quote.id, args.customer.name);
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    contactId?: string;
    messageId?: string | null;
    error?: string;
  }>('send-whatsapp-quote', {
    body: {
      phone: args.customer.phone,
      name: args.customer.name,
      caption: args.caption,
      pdfUrl,
      fileName,
    },
  });
  if (error) {
    // Network / function-not-found errors come through `error`. The function
    // itself returns 4xx with a JSON body, which lands in `data.error` below.
    throw new Error(error.message);
  }
  if (!data?.ok) {
    throw new Error(data?.error ?? 'Send failed.');
  }
  return { contactId: data.contactId ?? '', messageId: data.messageId ?? null, pdfUrl };
}
