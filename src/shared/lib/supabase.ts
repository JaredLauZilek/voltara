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
