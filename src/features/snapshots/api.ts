import { supabase } from '@/shared/lib/supabase';
import type { SnapshotMeta } from './types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/snapshot-db`;
const SNAPSHOT_SECRET = import.meta.env.VITE_SNAPSHOT_SECRET ?? '';
const BACKUP_BUCKET = 'backups';

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const { data, error } = await supabase
    .from('snapshot_meta')
    .select('*')
    .order('taken_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Calls the snapshot-db edge function with the shared secret. The function
 * does the heavy lifting (dump tables, walk attachments, zip, upload, prune)
 * — typically ~5–20 seconds end-to-end.
 */
export async function triggerSnapshot(): Promise<{ ok: boolean; id?: number; error?: string }> {
  if (!SNAPSHOT_SECRET) {
    return { ok: false, error: 'VITE_SNAPSHOT_SECRET is not configured.' };
  }
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Snapshot-Secret': SNAPSHOT_SECRET,
    },
    body: JSON.stringify({ trigger: 'manual' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
  return { ok: true, id: json?.id };
}

/** 60-minute signed URL — long enough for the user to click & download. */
export async function signedDownloadUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .createSignedUrl(storagePath, 60 * 60, { download: true });
  if (error || !data?.signedUrl) throw error ?? new Error('No URL');
  return data.signedUrl;
}

export async function deleteSnapshot(id: number, storagePath: string): Promise<void> {
  // Best-effort bucket delete first; even if it fails we proceed so the user
  // can clean up a phantom meta row.
  await supabase.storage.from(BACKUP_BUCKET).remove([storagePath]);
  const { error } = await supabase.from('snapshot_meta').delete().eq('id', id);
  if (error) throw error;
}
