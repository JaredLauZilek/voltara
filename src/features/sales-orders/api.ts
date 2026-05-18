import { supabase, stripId } from '@/shared/lib/supabase';
import type { Attachment } from '@/shared/types';
import type { SalesOrder, SalesOrderInsert, SalesOrderUpdate } from './types';

export async function listSalesOrders(): Promise<SalesOrder[]> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('*')
    .order('created_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSalesOrder(row: SalesOrderInsert): Promise<SalesOrder> {
  const { data, error } = await supabase.from('sales_orders').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateSalesOrder(id: string, patch: SalesOrderUpdate): Promise<SalesOrder> {
  const { data, error } = await supabase.from('sales_orders').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Delete attachments from Storage first — per CLAUDE.md §13. Orphan blobs in
// the bucket can't be cleaned up retroactively without an audit script.
export async function deleteSalesOrder(id: string, attachments: Attachment[]): Promise<void> {
  if (attachments.length > 0)
    await supabase.storage.from('attachments').remove(attachments.map((a) => a.storage_path));
  const { error } = await supabase.from('sales_orders').delete().eq('id', id);
  if (error) throw error;
}
