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
  /** Resolved against the caller's installation list when category may be
   *  "Installation" — null when there's no high-confidence match. */
  installation_id: string | null;
  /** Free-text site / customer name picked out of the invoice description.
   *  Surfaced even when no installation matched so the user can see what the
   *  parser saw and pick manually. */
  site_hint: string | null;
}

interface SupplierLite {
  id: string;
  name: string;
}

interface InstallationLite {
  id: string;
  customer_name: string;
  customer_address: string;
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
    site_hint: string | null;
  };
  error?: string;
}

export async function parseInvoice(
  file: File,
  suppliers: SupplierLite[],
  installations: InstallationLite[] = [],
): Promise<ParsedInvoice> {
  const file_base64 = await fileToBase64(file);
  const { data, error } = await supabase.functions.invoke<ApiResponse>('parse-invoice', {
    body: { file_base64, mime: file.type, filename: file.name },
  });
  if (error) throw new Error(error.message);
  if (!data?.ok || !data.fields) throw new Error(data?.error ?? 'Parse failed.');

  const fields = data.fields;
  const { supplier_id, vendor_guess } = matchSupplier(fields.vendor_name, suppliers);
  const installation_id = matchInstallation(fields.site_hint, installations);

  return {
    amount: fields.amount,
    tax: fields.tax,
    currency: fields.currency,
    bill_date: fields.bill_date,
    due_date: fields.due_date,
    reference: fields.reference,
    supplier_id,
    vendor_guess,
    installation_id,
    site_hint: fields.site_hint,
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

/** Try to identify which installation the contractor invoice corresponds to.
 *  We score each installation by how many normalized tokens of the
 *  customer-name + address are also present in the parsed site_hint. The
 *  highest-scoring installation wins, provided the score clears a small
 *  confidence floor — otherwise we return null and let the user pick. */
function matchInstallation(
  siteHint: string | null,
  installations: InstallationLite[],
): string | null {
  if (!siteHint || installations.length === 0) return null;
  const hintTokens = new Set(
    normalize(siteHint).split(' ').filter((t) => t.length >= 3),
  );
  if (hintTokens.size === 0) return null;

  let best: { id: string; score: number } | null = null;
  for (const inst of installations) {
    const haystack = normalize(`${inst.customer_name} ${inst.customer_address}`);
    const haystackTokens = haystack.split(' ').filter((t) => t.length >= 3);
    if (haystackTokens.length === 0) continue;
    // Count tokens from the installation that appear in the hint. Skip
    // ultra-generic tokens that match every Malaysian address ("jalan",
    // "taman", "no", numeric house numbers) so two unrelated installations
    // in different streets don't tie.
    const GENERIC = new Set(['jalan', 'taman', 'lorong', 'lot', 'no', 'bandar', 'desa']);
    let score = 0;
    for (const tok of haystackTokens) {
      if (GENERIC.has(tok)) continue;
      if (/^\d+$/.test(tok)) continue;
      if (hintTokens.has(tok)) score++;
    }
    if (!best || score > best.score) best = { id: inst.id, score };
  }
  // Require at least 2 distinct non-generic token hits — a single hit on a
  // bare customer name like "Yap" is too ambiguous to auto-link.
  if (!best || best.score < 2) return null;
  return best.id;
}
