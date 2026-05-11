import { supabase, stripId } from '@/shared/lib/supabase';
import type { Supplier, SupplierInsert, SupplierUpdate, SupplierWithStats, SupplierKind } from './types';

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listSuppliersWithStats(): Promise<SupplierWithStats[]> {
  const [suppliersRes, statsRes] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('vw_supplier_stats').select('*'),
  ]);
  if (suppliersRes.error) throw suppliersRes.error;
  if (statsRes.error) throw statsRes.error;
  const stats = new Map<string, { po_count: number; total_spend: number }>();
  for (const s of statsRes.data ?? []) stats.set(s.supplier_id, { po_count: s.po_count, total_spend: Number(s.total_spend) });
  return (suppliersRes.data ?? []).map((s) => ({
    ...s,
    po_count: stats.get(s.id)?.po_count ?? 0,
    total_spend: stats.get(s.id)?.total_spend ?? 0,
  }));
}

export async function createSupplier(row: SupplierInsert): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(id: string, patch: SupplierUpdate): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) throw error;
}

export async function listSupplierCategories(kind: SupplierKind): Promise<string[]> {
  const { data, error } = await supabase
    .from('supplier_categories')
    .select('name')
    .eq('kind', kind)
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function createSupplierCategory(kind: SupplierKind, name: string): Promise<void> {
  const { error } = await supabase.from('supplier_categories').insert({ name, kind });
  if (error) throw error;
}

export async function deleteSupplierCategory(kind: SupplierKind, name: string): Promise<void> {
  const { error } = await supabase
    .from('supplier_categories')
    .delete()
    .eq('name', name)
    .eq('kind', kind);
  if (error) throw error;
}
