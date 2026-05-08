import { supabase } from '@/shared/lib/supabase';
import type { Installation, InstallationInsert, InstallationUpdate } from './types';

export async function listInstallations(): Promise<Installation[]> {
  const { data, error } = await supabase.from('installations').select('*').order('scheduled', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInstallation(row: InstallationInsert): Promise<Installation> {
  const { data, error } = await supabase.from('installations').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateInstallation(id: string, patch: InstallationUpdate): Promise<Installation> {
  const { data, error } = await supabase.from('installations').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteInstallation(id: string): Promise<void> {
  const { error } = await supabase.from('installations').delete().eq('id', id);
  if (error) throw error;
}
