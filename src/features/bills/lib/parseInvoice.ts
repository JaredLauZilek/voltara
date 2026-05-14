// Vendor-invoice parser — calls the `parse-invoice` Supabase Edge Function,
// which proxies to the Anthropic Messages API with the file as a document
// (PDF) or image (PNG/JPG) content block. The model returns structured fields.
//
// Supplier matching is still done client-side: we take the vendor_name string
// returned by the model and fuzzy-match it against the existing suppliers
// list so the picker can auto-select.

import { supabase } from '@/shared/lib/supabase';
import type { BillCurrency } from '../types';

export interface ParsedInvoice {
  amount: number | null;
  tax: number | null;
  currency: BillCurrency | null;
  bill_date: string | null;     // YYYY-MM-DD
  due_date: string | null;      // YYYY-MM-DD
  reference: string | null;     // vendor invoice number / ref
  /** Resolved against the caller's supplier list — null if no confident match. */
  supplier_id: string | null;
  /** Free-text vendor name returned by the model, even when no supplier matched. */
  vendor_guess: string | null;
}

interface SupplierLite {
  id: string;
  name: string;
}

interface ApiResponse {
  ok: boolean;
  fields?: {
    amount: number | null;
    tax: number | null;
    currency: BillCurrency | null;
    bill_date: string | null;
    due_date: string | null;
    reference: string | null;
    vendor_name: string | null;
  };
  error?: string;
}

export async function parseInvoice(file: File, suppliers: SupplierLite[]): Promise<ParsedInvoice> {
  const file_base64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke<ApiResponse>('parse-invoice', {
    body: { file_base64, mime: file.type, filename: file.name },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.fields) throw new Error(data?.error ?? 'Parse failed.');

  const fields = data.fields;
  const { supplier_id, vendor_guess } = matchSupplier(fields.vendor_name, suppliers);

  return {
    amount: fields.amount,
    tax: fields.tax,
    currency: fields.currency,
    bill_date: fields.bill_date,
    due_date: fields.due_date,
    reference: fields.reference,
    supplier_id,
    vendor_guess,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:application/pdf;base64,JVBERi0xLjQK..." — strip the prefix.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Find an existing supplier whose name appears as a substring of the model's
 *  vendor_name (or vice versa). Longer matches win — more specific names
 *  outrank generic ones. */
function matchSupplier(
  vendorName: string | null,
  suppliers: SupplierLite[],
): { supplier_id: string | null; vendor_guess: string | null } {
  if (!vendorName) return { supplier_id: null, vendor_guess: null };
  const target = normalize(vendorName);
  if (target.length < 3) return { supplier_id: null, vendor_guess: vendorName };

  const hits = suppliers
    .map((s) => {
      const norm = normalize(s.name);
      if (norm.length < 3) return null;
      // Bidirectional substring: handles "ABB Malaysia" matching either way
      // against the parsed name, with or without entity suffixes.
      const matches = target.includes(norm) || norm.includes(target);
      return matches ? { id: s.id, name: s.name, score: norm.length } : null;
    })
    .filter((x): x is { id: string; name: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  if (hits.length > 0) return { supplier_id: hits[0].id, vendor_guess: hits[0].name };
  return { supplier_id: null, vendor_guess: vendorName };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    // Strip common entity suffixes so "ABB Malaysia Sdn. Bhd." matches "ABB Malaysia".
    .replace(/\bsdn\b|\bbhd\b|\bpte\b|\bltd\b|\bllc\b|\binc\b|\bco\b\.?|\bcompany\b/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
