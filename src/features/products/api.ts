import { supabase } from '@/shared/lib/supabase';
import type { Product, ProductInsert, ProductUpdate } from './types';

export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createProduct(row: ProductInsert): Promise<Product> {
  // Products are the only entity where the client owns the id (SKU) — the
  // user names it. Other tables strip the id and let the DB trigger assign;
  // here we keep it and let the products id-guard trigger validate.
  const { data, error } = await supabase.from('products').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, patch: ProductUpdate): Promise<Product> {
  const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}
