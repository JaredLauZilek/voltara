import { supabase, stripId } from '@/shared/lib/supabase';
import type { Post, PostInsert, PostUpdate } from './types';

export async function listPosts(): Promise<Post[]> {
  const { data, error } = await supabase.from('posts').select('*').order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPost(row: PostInsert): Promise<Post> {
  const { data, error } = await supabase.from('posts').insert(stripId(row)).select().single();
  if (error) throw error;
  return data;
}

export async function updatePost(id: string, patch: PostUpdate): Promise<Post> {
  const { data, error } = await supabase.from('posts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}
