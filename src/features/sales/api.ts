import { supabase } from '@/shared/lib/supabase';
import type { Quote, QuoteInsert, QuoteUpdate } from './types';

export async function listQuotes(): Promise<Quote[]> {
  const { data, error } = await supabase.from('quotes').select('*').order('valid_from', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createQuote(row: QuoteInsert): Promise<Quote> {
  const { data, error } = await supabase.from('quotes').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateQuote(id: string, patch: QuoteUpdate): Promise<Quote> {
  const { data, error } = await supabase.from('quotes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  if (error) throw error;
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
