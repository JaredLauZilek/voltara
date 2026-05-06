import { supabase } from '@/shared/lib/supabase';
import type { CompanyProfile, CompanyProfileUpdate, FormDesign, FormDesignUpdate, DocType } from './types';

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const { data, error } = await supabase.from('company_profile').select('*').eq('id', 'default').single();
  if (error) throw error;
  return data;
}

export async function updateCompanyProfile(patch: CompanyProfileUpdate): Promise<CompanyProfile> {
  const { data, error } = await supabase
    .from('company_profile')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listFormDesigns(): Promise<FormDesign[]> {
  const { data, error } = await supabase.from('form_designs').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function updateFormDesign(docType: DocType, patch: FormDesignUpdate): Promise<FormDesign> {
  const { data, error } = await supabase
    .from('form_designs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('doc_type', docType)
    .select()
    .single();
  if (error) throw error;
  return data;
}
