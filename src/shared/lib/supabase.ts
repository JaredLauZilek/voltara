import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. ' +
    'Copy .env.local.example to .env.local and fill in your project values.'
  );
}

export const supabase = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'anon');

/**
 * Strip the `id` field before insert. Every entity/transactional table has a
 * BEFORE INSERT trigger (migration 0031) that auto-assigns a year-month-grouped
 * id like `QO-202605-0001`. Sending one from the client would be ignored, but
 * stripping it keeps the request payload honest.
 *
 * The return type preserves `T` (id-required). supabase-js's stricter
 * `insert<Row extends Insert>` constraint rejects an `id?` widening, and the
 * server trigger overwrites whatever the client sends anyway — so we strip
 * at runtime but stay quiet at the type level.
 */
export function stripId<T extends { id?: unknown }>(row: T): T {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest } = row;
  return rest as T;
}
