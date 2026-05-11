import { supabase, stripId } from '@/shared/lib/supabase';
import type { PurchaseOrder, PurchaseOrderInsert, PurchaseOrderUpdate } from './types';

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .order('created_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPurchaseOrder(row: PurchaseOrderInsert): Promise<PurchaseOrder> {
  const { data, error } = await supabase.from('purchase_orders').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updatePurchaseOrder(id: string, patch: PurchaseOrderUpdate): Promise<PurchaseOrder> {
  const { data, error } = await supabase.from('purchase_orders').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
  if (error) throw error;
}
