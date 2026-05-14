import { supabase, stripId } from '@/shared/lib/supabase';
import { toMYR } from '@/shared/lib/currency';
import type { Supplier, SupplierInsert, SupplierUpdate, SupplierWithStats, SupplierKind } from './types';

interface POAggRow {
  supplier_id: string | null;
  line_items: { qty: number; unit_price_snapshot: number }[];
  discount: number;
  currency: string | null;
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function listSuppliersWithStats(): Promise<SupplierWithStats[]> {
  // We aggregate spend on the client instead of via vw_supplier_stats so that
  // multi-currency POs are converted to MYR via the static rate table in
  // shared/lib/currency.ts before summing. (The view sums raw numeric totals
  // and is currency-agnostic.)
  const [suppliersRes, posRes] = await Promise.all([
    supabase.from('suppliers').select('*').order('name'),
    supabase.from('purchase_orders').select('supplier_id, line_items, discount, currency'),
  ]);
  if (suppliersRes.error) throw suppliersRes.error;
  if (posRes.error) throw posRes.error;

  const stats = new Map<string, { po_count: number; total_spend: number }>();
  for (const po of (posRes.data ?? []) as POAggRow[]) {
    if (!po.supplier_id) continue;
    const subtotal = po.line_items.reduce((s, li) => s + li.qty * li.unit_price_snapshot, 0);
    const totalNative = subtotal * (1 - (po.discount ?? 0) / 100);
    const totalMYR = toMYR(totalNative, po.currency);
    const cur = stats.get(po.supplier_id) ?? { po_count: 0, total_spend: 0 };
    cur.po_count += 1;
    cur.total_spend += totalMYR;
    stats.set(po.supplier_id, cur);
  }

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
