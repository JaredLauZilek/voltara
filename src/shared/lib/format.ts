export function formatRM(value: number, fractionDigits = 0): string {
  return `RM ${value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

export function formatRMShort(value: number): string {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(1)}k`;
  return formatRM(value);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build the default download filename for a document PDF:
 *   "QO-202604-0001 (Siemens Sdn Bhd).pdf"
 *
 * Strips characters illegal on common filesystems (Windows is the strictest:
 * \ / : * ? " < > |) and collapses whitespace. Falls back to the doc id alone
 * when no party name is available (e.g. unlinked record).
 */
export function pdfFilename(docId: string, partyName: string | null | undefined): string {
  const cleanParty = (partyName ?? '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleanParty ? `${docId} (${cleanParty}).pdf` : `${docId}.pdf`;
}
