import { supabase } from '@/shared/lib/supabase';
import type {
  BlogCompetitor, BlogCompetitorInsert, BlogCompetitorUpdate,
  BlogKeyword, BlogKeywordInsert,
  BlogDraft, BlogDraftInsert, BlogDraftUpdate,
  BlogSeoSnapshot,
  AIBloggerConfig, AIBloggerConfigUpdate,
} from './types';

// ── competitors ─────────────────────────────────────────────────────────────

export async function listCompetitors(): Promise<BlogCompetitor[]> {
  const { data, error } = await supabase.from('blog_competitors').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}
export async function createCompetitor(row: BlogCompetitorInsert): Promise<BlogCompetitor> {
  const { data, error } = await supabase.from('blog_competitors').insert(row).select().single();
  if (error) throw error;
  return data;
}
export async function updateCompetitor(id: string, patch: BlogCompetitorUpdate): Promise<BlogCompetitor> {
  const { data, error } = await supabase.from('blog_competitors').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteCompetitor(id: string): Promise<void> {
  const { error } = await supabase.from('blog_competitors').delete().eq('id', id);
  if (error) throw error;
}

// ── keywords ────────────────────────────────────────────────────────────────

export async function listKeywords(): Promise<BlogKeyword[]> {
  const { data, error } = await supabase.from('blog_keywords').select('*').order('priority', { ascending: false }).order('keyword');
  if (error) throw error;
  return data ?? [];
}
export async function createKeyword(row: BlogKeywordInsert): Promise<BlogKeyword> {
  const { data, error } = await supabase.from('blog_keywords').insert(row).select().single();
  if (error) throw error;
  return data;
}
export async function deleteKeyword(id: string): Promise<void> {
  const { error } = await supabase.from('blog_keywords').delete().eq('id', id);
  if (error) throw error;
}

// ── drafts ──────────────────────────────────────────────────────────────────

export async function listDrafts(): Promise<BlogDraft[]> {
  const { data, error } = await supabase.from('blog_drafts').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function createDraft(row: BlogDraftInsert): Promise<BlogDraft> {
  const { data, error } = await supabase.from('blog_drafts').insert(row).select().single();
  if (error) throw error;
  return data;
}
export async function updateDraft(id: string, patch: BlogDraftUpdate): Promise<BlogDraft> {
  const { data, error } = await supabase
    .from('blog_drafts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.from('blog_drafts').delete().eq('id', id);
  if (error) throw error;
}

// ── snapshots ───────────────────────────────────────────────────────────────

export async function listSnapshots(draftId: string): Promise<BlogSeoSnapshot[]> {
  const { data, error } = await supabase
    .from('blog_seo_snapshots')
    .select('*')
    .eq('draft_id', draftId)
    .order('fetched_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── config singleton ────────────────────────────────────────────────────────

export async function getConfig(): Promise<AIBloggerConfig> {
  const { data, error } = await supabase.from('ai_blogger_config').select('*').eq('id', 'default').single();
  if (error) throw error;
  return data;
}
export async function updateConfig(patch: AIBloggerConfigUpdate): Promise<AIBloggerConfig> {
  const { data, error } = await supabase
    .from('ai_blogger_config')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Edge Function callers — Anthropic / Wix / Ahrefs proxies ───────────────

export async function invokeDraftFunction(args: {
  topic?: string;
  keyword_ids?: string[];
  competitor_ids?: string[];
}): Promise<BlogDraft> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; draft?: BlogDraft; error?: string }>(
    'ai-blogger-draft',
    { body: args },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.draft) throw new Error(data?.error ?? 'AI draft failed.');
  return data.draft;
}

export async function invokePublishFunction(draftId: string): Promise<BlogDraft> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; draft?: BlogDraft; error?: string }>(
    'ai-blogger-publish',
    { body: { draft_id: draftId } },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.draft) throw new Error(data?.error ?? 'Publish to Wix failed.');
  return data.draft;
}

export async function invokeSeoSnapshotFunction(draftId: string): Promise<BlogSeoSnapshot> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; snapshot?: BlogSeoSnapshot; error?: string }>(
    'ai-blogger-seo-snapshot',
    { body: { draft_id: draftId } },
  );
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.snapshot) throw new Error(data?.error ?? 'Ahrefs snapshot failed.');
  return data.snapshot;
}
