import { supabase } from '@/shared/lib/supabase';
import type { Order } from './types';

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
