import { supabase } from '@/shared/lib/supabase';
import type {
  CompanyEmailProfile,
  CompanyEmailProfileUpdate,
  EmailDesign,
  EmailDesignUpdate,
  DocType,
} from './types';

export async function getCompanyEmailProfile(): Promise<CompanyEmailProfile> {
  const { data, error } = await supabase
    .from('company_email_profile')
    .select('*')
    .eq('id', 'default')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompanyEmailProfile(
  patch: CompanyEmailProfileUpdate,
): Promise<CompanyEmailProfile> {
  const { data, error } = await supabase
    .from('company_email_profile')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listEmailDesigns(): Promise<EmailDesign[]> {
  const { data, error } = await supabase.from('email_designs').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function updateEmailDesign(
  docType: DocType,
  patch: EmailDesignUpdate,
): Promise<EmailDesign> {
  const { data, error } = await supabase
    .from('email_designs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('doc_type', docType)
    .select()
    .single();
  if (error) throw error;
  return data;
}
