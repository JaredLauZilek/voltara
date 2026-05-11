import { supabase, stripId } from '@/shared/lib/supabase';
import type { SalesManager, SalesManagerInsert, SalesManagerUpdate } from './types';

export async function listSalesManagers(): Promise<SalesManager[]> {
  const { data, error } = await supabase.from('sales_managers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createSalesManager(row: SalesManagerInsert): Promise<SalesManager> {
  const { data, error } = await supabase.from('sales_managers').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateSalesManager(id: string, patch: SalesManagerUpdate): Promise<SalesManager> {
  const { data, error } = await supabase.from('sales_managers').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSalesManager(id: string): Promise<void> {
  const { error } = await supabase.from('sales_managers').delete().eq('id', id);
  if (error) throw error;
}
