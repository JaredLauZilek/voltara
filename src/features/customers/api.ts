import { supabase } from '@/shared/lib/supabase';
import type { Customer, CustomerInsert, CustomerUpdate, CustomerWithStats } from './types';

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listCustomersWithStats(): Promise<CustomerWithStats[]> {
  const [customersRes, statsRes] = await Promise.all([
    supabase.from('customers').select('*').order('name'),
    supabase.from('vw_customer_stats').select('*'),
  ]);
  if (customersRes.error) throw customersRes.error;
  if (statsRes.error) throw statsRes.error;
  const stats = new Map<string, { installs: number; spend: number }>();
  for (const s of statsRes.data ?? []) stats.set(s.customer_id, { installs: s.installs, spend: Number(s.spend) });
  return (customersRes.data ?? []).map((c) => ({
    ...c,
    installs: stats.get(c.id)?.installs ?? 0,
    spend: stats.get(c.id)?.spend ?? 0,
  }));
}

export async function createCustomer(row: CustomerInsert): Promise<Customer> {
  const { data, error } = await supabase.from('customers').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, patch: CustomerUpdate): Promise<Customer> {
  const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}
