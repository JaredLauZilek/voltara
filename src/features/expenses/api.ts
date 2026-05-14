import { supabase, stripId } from '@/shared/lib/supabase';
import type { Attachment } from '@/shared/types';
import type { Expense, ExpenseInsert, ExpenseUpdate } from './types';

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(row: ExpenseInsert): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, patch: ExpenseUpdate): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string, attachments: Attachment[]): Promise<void> {
  if (attachments.length > 0)
    await supabase.storage.from('attachments').remove(attachments.map((a) => a.storage_path));
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ── expense_entities ───────────────────────────────────────────────────────

export async function listExpenseEntities(): Promise<string[]> {
  const { data, error } = await supabase.from('expense_entities').select('name').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function createExpenseEntity(name: string): Promise<void> {
  const { error } = await supabase.from('expense_entities').insert({ name });
  if (error) throw error;
}

export async function deleteExpenseEntity(name: string): Promise<void> {
  const { error } = await supabase.from('expense_entities').delete().eq('name', name);
  if (error) throw error;
}

// ── expense_categories ─────────────────────────────────────────────────────

export async function listExpenseCategories(): Promise<string[]> {
  const { data, error } = await supabase.from('expense_categories').select('name').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function createExpenseCategory(name: string): Promise<void> {
  const { error } = await supabase.from('expense_categories').insert({ name });
  if (error) throw error;
}

export async function deleteExpenseCategory(name: string): Promise<void> {
  const { error } = await supabase.from('expense_categories').delete().eq('name', name);
  if (error) throw error;
}
