import { supabase, stripId } from '@/shared/lib/supabase';
import type { Attachment } from '@/shared/types';
import type { Bill, BillInsert, BillUpdate } from './types';

export async function listBills(): Promise<Bill[]> {
  const { data, error } = await supabase.from('bills').select('*').order('bill_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBill(row: BillInsert): Promise<Bill> {
  const { data, error } = await supabase.from('bills').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateBill(id: string, patch: BillUpdate): Promise<Bill> {
  const { data, error } = await supabase.from('bills').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBill(id: string, attachments: Attachment[]): Promise<void> {
  if (attachments.length > 0)
    await supabase.storage.from('attachments').remove(attachments.map((a) => a.storage_path));
  const { error } = await supabase.from('bills').delete().eq('id', id);
  if (error) throw error;
}

// ── bill_categories ────────────────────────────────────────────────────────

export async function listBillCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('bill_categories').select('name').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function createBillCategory(name: string): Promise<void> {
  const { error } = await supabase.from('bill_categories').insert({ name });
  if (error) throw error;
}

export async function deleteBillCategory(name: string): Promise<void> {
  const { error } = await supabase.from('bill_categories').delete().eq('name', name);
  if (error) throw error;
}
