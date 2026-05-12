import { supabase, stripId } from '@/shared/lib/supabase';
import type { Attachment } from '@/shared/types';
import type { Quote, QuoteInsert, QuoteUpdate } from './types';

export async function listQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase.from('quotes').select('*').order('valid_from', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuote(row: QuoteInsert): Promise<Quote> {
  const { data, error } = await supabase.from('quotes').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateQuote(id: string, patch: QuoteUpdate): Promise<Quote> {
  const { data, error } = await supabase.from('quotes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuote(
  id: string,
  poAttachments: Attachment[],
  proposalAttachments: Attachment[],
): Promise<void> {
  const paths = [...poAttachments, ...proposalAttachments].map((a) => a.storage_path);
  if (paths.length > 0) await supabase.storage.from('attachments').remove(paths);
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) {
    // The FK from invoices.quote_id has NO ACTION on delete — supabase returns
    // 23503. Translate to something the user can act on.
    if (error.code === '23503') {
      throw new Error(
        'This quote has a linked invoice. Delete or unlink the invoice first.',
      );
    }
    throw error;
  }
}

export async function expireOverdueQuotes(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'Expired' })
    .lt('valid_to', today)
    .in('status', ['Draft', 'Sent']);
  if (error) throw error;
}
