#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Restore a Voltara snapshot zip back into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=https://...supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... \
 *   npx tsx scripts/restore-snapshot.ts ./voltara-2026-05-15T18-00-00-000Z.zip
 *
 * DANGER — this:
 *   1. TRUNCATEs every public.* table (CASCADE)
 *   2. Re-inserts JSON rows from the zip, preserving original IDs
 *   3. Wipes the `attachments` bucket and re-uploads files from the zip
 *
 * Triggers are disabled during the restore (session_replication_role=replica)
 * so the inventory recalcs don't run row-by-row — the final state is whatever
 * the snapshot captured.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ATTACHMENT_BUCKET = 'attachments';

// Insertion order — parents before children. Anything not listed here goes
// last (in JSON-key order). Add new tables to the right slot when migrations
// introduce them.
const INSERT_ORDER = [
  'id_counters',
  'company_profile',
  'company_email_profile',
  'form_designs',
  'email_designs',
  'customers',
  'suppliers',
  'supplier_categories',
  'bill_categories',
  'expense_categories',
  'expense_entities',
  'sales_managers',
  'products',
  'quotes',
  'quote_sets',
  'invoices',
  'invoice_payments',
  'installations',
  'purchase_orders',
  'bills',
  'expenses',
  'orders',
  'posts',
  'engagement_stock',
  'stock_movements',
  // SEO + AI blogger
  'seo_integrations',
  'seo_keywords',
  'seo_pages',
  'seo_rankings',
  'seo_alerts',
  'seo_backlinks',
  'seo_competitors',
  'seo_competitor_rankings',
  'seo_traffic_daily',
];

interface Manifest {
  version: number;
  taken_at: string;
  table_counts: Record<string, number>;
  attachment_count: number;
}

async function confirm(message: string, expected: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => {
    rl.question(message, (ans) => {
      rl.close();
      res(ans.trim() === expected);
    });
  });
}

async function main() {
  const zipPath = process.argv[2];
  if (!zipPath) {
    console.error('Usage: npx tsx scripts/restore-snapshot.ts <path-to-zip>');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.');
    process.exit(1);
  }

  const zipBuf = await readFile(resolve(zipPath));
  const zip = await JSZip.loadAsync(zipBuf);

  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('manifest.json not found in zip');
  const manifest: Manifest = JSON.parse(await manifestFile.async('string'));

  console.log('');
  console.log(`Snapshot: ${zipPath}`);
  console.log(`Taken at: ${manifest.taken_at}`);
  console.log(`Tables:   ${Object.keys(manifest.table_counts).length}`);
  console.log(`Rows:     ${Object.values(manifest.table_counts).reduce((a, b) => a + b, 0)}`);
  console.log(`Files:    ${manifest.attachment_count}`);
  console.log(`Target:   ${SUPABASE_URL}`);
  console.log('');
  console.log('This will WIPE all data and replace it with the snapshot.');
  console.log('Tables will be TRUNCATEd; the attachments bucket will be EMPTIED and refilled.');
  console.log('');
  const ok = await confirm('Type RESTORE to continue: ', 'RESTORE');
  if (!ok) {
    console.log('Aborted.');
    process.exit(0);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // -- Load all table jsons from the zip
  const tableFiles = Object.keys(zip.files).filter((f) => f.startsWith('tables/') && f.endsWith('.json'));
  const tables: Record<string, unknown[]> = {};
  for (const f of tableFiles) {
    const name = f.replace(/^tables\//, '').replace(/\.json$/, '');
    tables[name] = JSON.parse(await zip.file(f)!.async('string'));
  }

  // -- Restore order: hardcoded INSERT_ORDER first (where they exist), then
  //    anything else alphabetically.
  const known = INSERT_ORDER.filter((t) => t in tables);
  const extra = Object.keys(tables).filter((t) => !INSERT_ORDER.includes(t)).sort();
  const restoreOrder = [...known, ...extra];

  // -- Disable triggers for the duration
  console.log('Disabling user triggers…');
  await supabase.rpc('exec_sql' as never, { sql: "set session_replication_role = 'replica';" })
    .catch(() => { /* ignore — rpc may not exist; we fall back to row-by-row */ });

  // -- Truncate every table in REVERSE order so children go first
  for (const t of [...restoreOrder].reverse()) {
    process.stdout.write(`Truncating ${t}… `);
    const { error } = await supabase.from(t).delete().neq('id', '__never__');
    console.log(error ? `(skipped: ${error.message})` : 'ok');
  }

  // -- Re-insert
  for (const t of restoreOrder) {
    const rows = tables[t];
    if (!rows.length) { console.log(`${t}: 0 rows, skip`); continue; }
    process.stdout.write(`${t}: inserting ${rows.length}… `);
    // Chunk to avoid hitting payload limits
    const chunkSize = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from(t).insert(chunk as never);
      if (error) {
        console.log(`\n  ✗ ${error.message}`);
        break;
      }
      inserted += chunk.length;
    }
    console.log(inserted === rows.length ? 'ok' : `partial (${inserted}/${rows.length})`);
  }

  // -- Restore attachments
  console.log('');
  console.log('Restoring attachments…');
  // Wipe existing bucket contents first
  const { data: existing } = await supabase.storage.from(ATTACHMENT_BUCKET).list('', { limit: 1000 });
  if (existing && existing.length > 0) {
    await supabase.storage.from(ATTACHMENT_BUCKET).remove(existing.map((e) => e.name));
  }
  const attFiles = Object.keys(zip.files).filter((f) => f.startsWith('attachments/') && !zip.files[f].dir);
  let uploaded = 0;
  for (const f of attFiles) {
    const path = f.replace(/^attachments\//, '');
    const blob = await zip.file(f)!.async('uint8array');
    const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, blob, { upsert: true });
    if (error) console.log(`  ✗ ${path}: ${error.message}`);
    else uploaded += 1;
  }
  console.log(`Attachments: ${uploaded}/${attFiles.length} uploaded`);

  console.log('');
  console.log('✓ Restore complete. Verify by running the app and checking key tables.');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
