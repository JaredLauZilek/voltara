// Minimal RFC-4180 CSV serializer. No external dependency.
// Wraps fields containing commas, quotes, or newlines in double quotes,
// and escapes embedded double quotes by doubling them.

type Cell = string | number | boolean | null | undefined;

function escape(value: Cell): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escape).join(',')];
  for (const r of rows) lines.push(r.map(escape).join(','));
  // Excel-friendly: leading BOM so it opens as UTF-8 cleanly.
  return '﻿' + lines.join('\r\n');
}
