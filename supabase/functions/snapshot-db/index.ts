/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { createClient } from 'jsr:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';

// ─── Auth ───────────────────────────────────────────────────────────────────
const SNAPSHOT_SECRET = Deno.env.get('SNAPSHOT_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Most recent N completed snapshots to retain. Raised from 3 to 7: with a
// nightly cadence, 3 only lets you roll back three days, so a problem noticed
// on Monday that started on Thursday has already aged out. A week of dailies
// is the smallest window that survives a weekend.
const KEEP = 7;
const ATTACHMENT_BUCKET = 'attachments';
const BACKUP_BUCKET = 'backups';

// Rows fetched per PostgREST request. Also caps peak memory per table and
// dodges the server-side max-rows ceiling, which silently truncated a bare
// select('*') once a table passed 1000 rows.
const PAGE = 1000;

// A run killed by the edge runtime never reaches its own catch block, so its
// meta row is stranded at 'pending' forever — that is how 34 nights of
// failures went unnoticed. Each run sweeps older stragglers to 'failed' so
// the Snapshots screen tells the truth even when the runtime SIGKILLs us.
const STALE_PENDING_MS = 30 * 60 * 1000;

// Tables we explicitly skip — snapshot_meta would self-reference and grow
// the snapshot on every run; the audit log lives in the DB anyway.
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

  // 2. Reap stranded rows from previously-killed runs before adding our own.
  const staleCutoff = new Date(Date.now() - STALE_PENDING_MS).toISOString();
  const { data: reaped } = await supabase
    .from('snapshot_meta')
    .update({
      status: 'failed',
      error: 'Run was terminated by the edge runtime before it could finish (no completion record).',
    })
    .eq('status', 'pending')
    .lt('taken_at', staleCutoff)
    .select('id');
  const reapedCount = reaped?.length ?? 0;

  // 3. Create pending meta row up front so we can record errors against it
  const { data: metaRow, error: metaErr } = await supabase
    .from('snapshot_meta')
    .insert({ storage_path: '(pending)', trigger, status: 'pending' })
    .select('id')
    .single<MetaRow>();
  if (metaErr || !metaRow) {
    return json({ error: `Could not create meta row: ${metaErr?.message}` }, 500);
  }
  const metaId = metaRow.id;

  const takenAt = new Date().toISOString();
  const stamp = takenAt.replace(/[:.]/g, '-');
  const storagePath = `voltara-${stamp}.zip`;
  const attachmentPrefix = `voltara-${stamp}-attachments`;

  try {
    const zip = new JSZip();
    const tableCounts: Record<string, number> = {};

    // 4. Discover tables in public schema (excluding skip list)
    const { data: tableRows, error: tableErr } = await supabase
      .rpc('snapshot_list_tables');
    if (tableErr) throw new Error(`List tables: ${tableErr.message}`);
    const tableNames = (tableRows ?? [])
      .map((r: { name: string }) => r.name)
      .filter((n: string) => !SKIP_TABLES.has(n));

    // 5. Dump each table, one page at a time
    for (const t of tableNames) {
      const rows: unknown[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from(t).select('*').range(from, from + PAGE - 1);
        if (error) throw new Error(`Dump ${t}: ${error.message}`);
        const page = data ?? [];
        rows.push(...page);
        if (page.length < PAGE) break;
      }
      tableCounts[t] = rows.length;
      zip.file(`tables/${t}.json`, JSON.stringify(rows, null, 0));
    }

    // 6. Copy attachments bucket → backup bucket, server-side.
    //
    //    This is the fix for the OOM. The old version downloaded every blob
    //    into the isolate and held it in the zip, so peak memory grew with the
    //    bucket (38 MB of attachments, doubled again by JSZip's output buffer)
    //    until the runtime killed the process. Storage-to-storage copy moves
    //    the bytes entirely inside Supabase — nothing transits this function,
    //    so memory is now flat regardless of how large the bucket gets.
    let attachmentCount = 0;
    let attachmentBytes = 0;
    const copyFailures: string[] = [];

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
        const { error: cpErr } = await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .copy(full, `${attachmentPrefix}/${full}`, { destinationBucket: BACKUP_BUCKET });
        if (cpErr) {
          copyFailures.push(`${full}: ${cpErr.message}`);
          continue;
        }
        attachmentCount += 1;
        // Size comes from the listing, so we still report real byte counts
        // without ever reading the file.
        attachmentBytes += Number(entry.metadata?.size ?? 0);
      }
    };
    await walk('');

    // 7. Manifest
    zip.file('manifest.json', JSON.stringify({
      version: 2,
      taken_at: takenAt,
      trigger,
      table_counts: tableCounts,
      attachment_count: attachmentCount,
      attachment_bytes: attachmentBytes,
      // v2: attachments live beside the zip in the backups bucket rather than
      // inside it. restore-snapshot.ts reads this to find them.
      attachments_bucket: BACKUP_BUCKET,
      attachments_prefix: attachmentPrefix,
      attachment_errors: copyFailures,
    }, null, 2));

    // 8. Upload zip — now just table JSON + manifest, so it stays small
    const zipBuf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const { error: upErr } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(storagePath, zipBuf, { contentType: 'application/zip', upsert: false });
    if (upErr) throw new Error(`Upload zip: ${upErr.message}`);

    // 9. Mark meta row complete. A partial attachment copy is still a usable
    //    database backup, so it completes — but the warning surfaces on the
    //    Snapshots screen rather than passing silently.
    const duration = Date.now() - startedAt;
    const warning = copyFailures.length
      ? `${copyFailures.length} attachment(s) could not be copied: ${copyFailures.slice(0, 3).join('; ')}`
      : null;
    await supabase.from('snapshot_meta').update({
      storage_path: storagePath,
      bytes: zipBuf.byteLength + attachmentBytes,
      table_counts: tableCounts,
      status: 'completed',
      error: warning,
      duration_ms: duration,
    }).eq('id', metaId);

    // 10. Retention — keep only KEEP most recent COMPLETED snapshots
    const { data: kept } = await supabase
      .from('snapshot_meta')
      .select('id, storage_path')
      .eq('status', 'completed')
      .order('taken_at', { ascending: false });
    const toDelete = (kept ?? []).slice(KEEP);
    for (const old of toDelete) {
      await supabase.storage.from(BACKUP_BUCKET).remove([old.storage_path]);
      // v2 snapshots also own a sibling attachments folder; v1 zips carried
      // their attachments inside, so removeFolder is a no-op for those.
      await removeFolder(supabase, old.storage_path.replace(/\.zip$/, '-attachments'));
      await supabase.from('snapshot_meta').delete().eq('id', old.id);
    }

    return json({
      ok: true,
      id: metaId,
      storage_path: storagePath,
      bytes: zipBuf.byteLength + attachmentBytes,
      zip_bytes: zipBuf.byteLength,
      tables: Object.keys(tableCounts).length,
      attachments: attachmentCount,
      attachment_errors: copyFailures.length,
      reaped_stale: reapedCount,
      pruned: toDelete.length,
      duration_ms: duration,
    });
  } catch (e) {
    const msg = (e as Error).message ?? 'Unknown error';
    // Best-effort cleanup so a failed run doesn't leave orphaned copies behind.
    await removeFolder(supabase, attachmentPrefix).catch(() => {});
    await supabase.from('snapshot_meta').update({
      status: 'failed', error: msg, duration_ms: Date.now() - startedAt,
    }).eq('id', metaId);
    return json({ error: msg }, 500);
  }
});

/** Recursively delete a prefix in the backups bucket. */
async function removeFolder(
  supabase: ReturnType<typeof createClient>,
  prefix: string,
): Promise<void> {
  const { data: entries, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error || !entries?.length) return;
  const files: string[] = [];
  for (const entry of entries) {
    const full = `${prefix}/${entry.name}`;
    if (entry.id === null) await removeFolder(supabase, full);
    else files.push(full);
  }
  if (files.length) await supabase.storage.from(BACKUP_BUCKET).remove(files);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return await req.json(); } catch { return null; }
}
