import { supabase, stripId } from '@/shared/lib/supabase';
import type { Invoice, InvoiceInsert, InvoiceUpdate } from './types';

export async function listInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase.from('invoices').select('*').order('issue_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInvoice(row: InvoiceInsert): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateInvoice(id: string, patch: InvoiceUpdate): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}
