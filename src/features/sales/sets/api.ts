import { supabase } from '@/shared/lib/supabase';
import type { QuoteSet, QuoteSetInsert, QuoteSetUpdate } from './types';

export async function listQuoteSets(): Promise<QuoteSet[]> {
  const { data, error } = await supabase.from('quote_sets').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createQuoteSet(row: QuoteSetInsert): Promise<QuoteSet> {
  const { data, error } = await supabase.from('quote_sets').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateQuoteSet(id: string, patch: QuoteSetUpdate): Promise<QuoteSet> {
  const { data, error } = await supabase.from('quote_sets').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuoteSet(id: string): Promise<void> {
  const { error } = await supabase.from('quote_sets').delete().eq('id', id);
  if (error) throw error;
}
