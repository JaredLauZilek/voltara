// Expense-side wrapper around the `parse-invoice` Supabase Edge Function.
// Same Anthropic-vision pipeline as bills, but the parsed `vendor_name` is
// matched against the user's managed expense_entities list instead of
// suppliers — and currency/tax/due_date are dropped since the expenses
// table has no use for them.

import { supabase } from '@/shared/lib/supabase';
import type { ExpenseCategory } from '../types';

export interface ParsedExpenseInvoice {
  amount: number | null;
  expense_date: string | null;     // YYYY-MM-DD — was `bill_date` from the model
  reference: string | null;
  /** Matched against the existing expense_entities list. null if no confident match. */
  entity: string | null;
  /** Raw vendor name the model returned, kept so we can show it as a "no match" chip. */
  vendor_guess: string | null;
  /** Model-picked category, validated against EXPENSE_CATEGORIES server-side. */
  category: ExpenseCategory | null;
}

interface ApiResponse {
  ok: boolean;
  fields?: {
    amount: number | null;
    tax: number | null;
    currency: string | null;
    bill_date: string | null;
    due_date: string | null;
    reference: string | null;
    vendor_name: string | null;
    category: string | null;
  };
  error?: string;
}

export async function parseExpenseInvoice(
  file: File,
  entities: string[],
  categories: readonly ExpenseCategory[],
): Promise<ParsedExpenseInvoice> {
  const file_base64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke<ApiResponse>('parse-invoice', {
    body: {
      file_base64,
      mime: file.type,
      filename: file.name,
      categories: [...categories],
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.fields) throw new Error(data?.error ?? 'Parse failed.');

  const fields = data.fields;
  const { entity, vendor_guess } = matchEntity(fields.vendor_name, entities);

  const category =
    fields.category && (categories as readonly string[]).includes(fields.category)
      ? (fields.category as ExpenseCategory)
      : null;

  return {
    amount: fields.amount,
    expense_date: fields.bill_date,
    reference: fields.reference,
    entity,
    vendor_guess,
    category,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:application/pdf;base64,…" — strip the prefix.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Find an existing entity whose name appears as a substring of the model's
 *  vendor_name (or vice versa). Longer matches win. */
function matchEntity(
  vendorName: string | null,
  entities: string[],
): { entity: string | null; vendor_guess: string | null } {
  if (!vendorName) return { entity: null, vendor_guess: null };
  const target = normalize(vendorName);
  if (target.length < 3) return { entity: null, vendor_guess: vendorName };

  const hits = entities
    .map((name) => {
      const norm = normalize(name);
      if (norm.length < 3) return null;
      const matches = target.includes(norm) || norm.includes(target);
      return matches ? { name, score: norm.length } : null;
    })
    .filter((x): x is { name: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  if (hits.length > 0) return { entity: hits[0].name, vendor_guess: hits[0].name };
  return { entity: null, vendor_guess: vendorName };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\bsdn\b|\bbhd\b|\bpte\b|\bltd\b|\bllc\b|\binc\b|\bco\b\.?|\bcompany\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
