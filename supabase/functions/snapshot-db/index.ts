/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';

// ─── Auth ───────────────────────────────────────────────────────────────────
const SNAPSHOT_SECRET = Deno.env.get('SNAPSHOT_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const KEEP = 3; // most recent N snapshots
const ATTACHMENT_BUCKET = 'attachments';
const BACKUP_BUCKET = 'backups';

// Tables we explicitly skip — snapshot_meta would self-reference and grow
// the zip on every run; the audit log lives in the DB anyway.
const SKIP_TABLES = new Set(['snapshot_meta']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-snapshot-secret',
  'Access-Control-Max-Age': '86400',
};

interface MetaRow { id: number }

Deno.serve(async (req: Request) => {
  // Browser preflight — must short-circuit before the auth check so the
  // X-Snapshot-Secret header (which isn't sent on OPTIONS) doesn't fail it.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // 1. Auth gate
  const provided = req.headers.get('X-Snapshot-Secret') ?? '';
  if (!SNAPSHOT_SECRET || provided !== SNAPSHOT_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const body = await safeJson(req);
  const trigger: 'manual' | 'cron' = body?.trigger === 'cron' ? 'cron' : 'manual';
  const startedAt = Date.now();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Create pending meta row up front so we can record errors against it
  const { data: metaRow, error: metaErr } = await supabase
    .from('snapshot_meta')
    .insert({ storage_path: '(pending)', trigger, status: 'pending' })
    .select('id')
    .single<MetaRow>();
  if (metaErr || !metaRow) {
    return json({ error: `Could not create meta row: ${metaErr?.message}` }, 500);
  }
  const metaId = metaRow.id;

  try {
    const zip = new JSZip();
    const tableCounts: Record<string, number> = {};

    // 3. Discover tables in public schema (excluding skip list)
    const { data: tableRows, error: tableErr } = await supabase
      .rpc('snapshot_list_tables');
    if (tableErr) throw new Error(`List tables: ${tableErr.message}`);
    const tableNames = (tableRows ?? [])
      .map((r: { name: string }) => r.name)
      .filter((n: string) => !SKIP_TABLES.has(n));

    // 4. Dump each table
    for (const t of tableNames) {
      const { data, error } = await supabase.from(t).select('*');
      if (error) throw new Error(`Dump ${t}: ${error.message}`);
      tableCounts[t] = data?.length ?? 0;
      zip.file(`tables/${t}.json`, JSON.stringify(data ?? [], null, 0));
    }

    // 5. Walk attachments bucket and copy every blob in
    let attachmentCount = 0;
    let attachmentBytes = 0;
    const walk = async (prefix: string) => {
      const { data: entries, error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw new Error(`List ${prefix}: ${error.message}`);
      for (const entry of entries ?? []) {
        const full = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Folders have an id of null in supabase-js list response
        if (entry.id === null) {
          await walk(full);
          continue;
        }
        const { data: blob, error: dlErr } = await supabase.storage
          .from(ATTACHMENT_BUCKET).download(full);
        if (dlErr || !blob) {
          console.warn(`Skipped ${full}: ${dlErr?.message}`);
          continue;
        }
        const buf = new Uint8Array(await blob.arrayBuffer());
        zip.file(`attachments/${full}`, buf);
        attachmentCount += 1;
        attachmentBytes += buf.byteLength;
      }
    };
    await walk('');

    // 6. Manifest
    const takenAt = new Date().toISOString();
    zip.file('manifest.json', JSON.stringify({
      version: 1,
      taken_at: takenAt,
      trigger,
      table_counts: tableCounts,
      attachment_count: attachmentCount,
      attachment_bytes: attachmentBytes,
    }, null, 2));

    // 7. Upload zip
    const zipBuf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const storagePath = `voltara-${takenAt.replace(/[:.]/g, '-')}.zip`;
    const { error: upErr } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(storagePath, zipBuf, { contentType: 'application/zip', upsert: false });
    if (upErr) throw new Error(`Upload zip: ${upErr.message}`);

    // 8. Mark meta row complete
    const duration = Date.now() - startedAt;
    await supabase.from('snapshot_meta').update({
      storage_path: storagePath,
      bytes: zipBuf.byteLength,
      table_counts: tableCounts,
      status: 'completed',
      duration_ms: duration,
    }).eq('id', metaId);

    // 9. Retention — keep only KEEP most recent COMPLETED snapshots
    const { data: kept } = await supabase
      .from('snapshot_meta')
      .select('id, storage_path')
      .eq('status', 'completed')
      .order('taken_at', { ascending: false });
    const toDelete = (kept ?? []).slice(KEEP);
    for (const old of toDelete) {
      await supabase.storage.from(BACKUP_BUCKET).remove([old.storage_path]);
      await supabase.from('snapshot_meta').delete().eq('id', old.id);
    }

    return json({
      ok: true,
      id: metaId,
      storage_path: storagePath,
      bytes: zipBuf.byteLength,
      tables: Object.keys(tableCounts).length,
      attachments: attachmentCount,
      pruned: toDelete.length,
      duration_ms: duration,
    });
  } catch (e) {
    const msg = (e as Error).message ?? 'Unknown error';
    await supabase.from('snapshot_meta').update({
      status: 'failed', error: msg, duration_ms: Date.now() - startedAt,
    }).eq('id', metaId);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return await req.json(); } catch { return null; }
}
