import { supabase } from '@/shared/lib/supabase';
import type {
  SeoAlert,
  SeoBacklink,
  SeoCompetitor,
  SeoIntegration,
  SeoKeyword,
  SeoPage,
  SeoSummary,
  SeoTopMover,
  SeoTraffic,
} from './types';

export async function listKeywords(): Promise<SeoKeyword[]> {
  const { data, error } = await supabase.from('seo_keywords').select('*').order('keyword');
  if (error) throw error;
  return data ?? [];
}

export async function listTopMovers(): Promise<SeoTopMover[]> {
  const { data, error } = await supabase.from('vw_seo_top_movers').select('*').limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function listPages(): Promise<SeoPage[]> {
  const { data, error } = await supabase.from('seo_pages').select('*').order('url');
  if (error) throw error;
  return data ?? [];
}

export async function listTraffic(days: number = 28): Promise<SeoTraffic[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('seo_traffic_daily')
    .select('*')
    .gte('captured_date', since.toISOString().slice(0, 10))
    .order('captured_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBacklinks(): Promise<SeoBacklink[]> {
  const { data, error } = await supabase
    .from('seo_backlinks')
    .select('*')
    .order('last_seen', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function listCompetitors(): Promise<SeoCompetitor[]> {
  const { data, error } = await supabase.from('seo_competitors').select('*').order('domain');
  if (error) throw error;
  return data ?? [];
}

export async function listAlerts(): Promise<SeoAlert[]> {
  const { data, error } = await supabase
    .from('seo_alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSummary(): Promise<SeoSummary | null> {
  const { data, error } = await supabase.from('vw_seo_summary').select('*').maybeSingle();
  if (error) throw error;
  return data;
}

export async function listIntegrations(): Promise<SeoIntegration[]> {
  const { data, error } = await supabase.from('seo_integrations').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function acknowledgeAlert(id: number): Promise<void> {
  const { error } = await supabase
    .from('seo_alerts')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function countOpenAlerts(): Promise<number> {
  const { count, error } = await supabase
    .from('seo_alerts')
    .select('*', { count: 'exact', head: true })
    .is('acknowledged_at', null);
  if (error) throw error;
  return count ?? 0;
}
