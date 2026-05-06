import { supabase } from '@/shared/lib/supabase';
import type { Installation } from './types';

export async function listInstallations(): Promise<Installation[]> {
  const { data, error } = await supabase.from('installations').select('*').order('scheduled', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
