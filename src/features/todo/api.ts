import { supabase, stripId } from '@/shared/lib/supabase';
import type { Task, TaskInsert, TaskUpdate } from './types';

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTask(row: TaskInsert): Promise<Task> {
  const { data, error } = await supabase.from('tasks').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
