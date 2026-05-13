import { useMemo, useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { useCreateCustomer } from './hooks';
import { CUSTOMER_TYPES, CUSTOMER_STATUSES, LEAD_SOURCES } from './types';
import type { CustomerInsert, Customer, LeadSource } from './types';

interface Props {
  onClose: () => void;
}

const TEMPLATE_HEADERS = [
  'name',
  'email',
  'phone',
  'type',
  'status',
  'joined',
  'lead_source',
  'attention_to',
  'address',
  'notes',
] as const;

const TEMPLATE_EXAMPLE_ROWS: string[][] = [
  ['Boni Lobo',     'boni@example.com',  '+60192256634', 'Residential', 'Active', '2026-05-13', 'WhatsApp (Google)', '',           'No 31, Jalan B, Shah Alam', ''],
  ['Acme Sdn Bhd',  'admin@acme.com.my', '+60376123456', 'Commercial',  'Active', '2026-05-13', 'Website Enquiry',   'Mr. Tan',    'Level 5, Menara Acme',     'Bulk B2B account'],
];

interface ParsedRow {
  raw: Record<string, string>;
  data: CustomerInsert | null;
  errors: string[];
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};

/** Minimal CSV parser — handles quoted fields with embedded commas, double-quote
 *  escaping (""), and CRLF/LF line endings. Returns an array of records keyed
 *  by the header row. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  // Strip a leading BOM if Excel added one.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',') { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\r') { i += 1; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i += 1; continue; }
    field += ch; i += 1;
  }
  // Trailing field
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    // Skip fully-blank lines.
    if (cells.every((c) => c.trim() === '')) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { rec[h] = (cells[idx] ?? '').trim(); });
    out.push(rec);
  }
  return out;
}

function buildTemplateCsv(): string {
  const escape = (v: string) =>
    /[,"\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = [TEMPLATE_HEADERS.join(',')];
  for (const row of TEMPLATE_EXAMPLE_ROWS) lines.push(row.map(escape).join(','));
  return lines.join('\r\n') + '\r\n';
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, and DD-MM-YYYY (Malaysian Excel default).
 *  Returns ISO YYYY-MM-DD or null if unparseable. */
function parseFlexibleDate(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(new Date(t).getTime())) return t;
  const dmy = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    if (!Number.isNaN(new Date(iso).getTime())) return iso;
  }
  return null;
}

/** Cleans a phone string: strips spaces/dashes/parens, detects Excel's
 *  scientific-notation mangling ("6.01E+11"), and adds a leading + when the
 *  number looks like an international format already. */
function parsePhone(v: string): { value: string | null; error: string | null } {
  const t = v.trim();
  if (!t) return { value: null, error: null };
  if (/e[+\-]?\d+/i.test(t)) {
    return { value: null, error: 'phone got mangled by Excel (scientific notation). In Excel, format the phone cell as Text before pasting digits, or prefix the value with an apostrophe.' };
  }
  const cleaned = t.replace(/[\s\-()]/g, '');
  if (!/^\+?\d{6,16}$/.test(cleaned)) {
    return { value: null, error: 'phone format invalid (digits only, 6-16 chars)' };
  }
  return { value: cleaned.startsWith('+') ? cleaned : `+${cleaned}`, error: null };
}

function validateRow(raw: Record<string, string>): ParsedRow {
  const errors: string[] = [];
  const name = (raw.name ?? '').trim();
  if (!name) errors.push('name is required');

  const email = (raw.email ?? '').trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('email format invalid');
  }

  const phoneRes = parsePhone(raw.phone ?? '');
  if (phoneRes.error) errors.push(phoneRes.error);
  const phone = phoneRes.value;

  let type: Customer['type'] = 'Residential';
  if (raw.type) {
    const t = raw.type.trim();
    if (!CUSTOMER_TYPES.includes(t as Customer['type'])) {
      errors.push(`type must be one of ${CUSTOMER_TYPES.join(' / ')}`);
    } else {
      type = t as Customer['type'];
    }
  }

  let status: Customer['status'] = 'Active';
  if (raw.status) {
    const s = raw.status.trim();
    if (!CUSTOMER_STATUSES.includes(s as Customer['status'])) {
      errors.push(`status must be Active or Inactive`);
    } else {
      status = s as Customer['status'];
    }
  }

  let joined: string | null = new Date().toISOString().slice(0, 10);
  if (raw.joined) {
    const iso = parseFlexibleDate(raw.joined);
    if (!iso) {
      errors.push('joined must be YYYY-MM-DD or DD/MM/YYYY');
      joined = null;
    } else {
      joined = iso;
    }
  }

  let lead_source: LeadSource | null = null;
  if (raw.lead_source) {
    const ls = raw.lead_source.trim();
    if (!LEAD_SOURCES.includes(ls as LeadSource)) {
      errors.push(`lead_source must be one of ${LEAD_SOURCES.join(' / ')}`);
    } else {
      lead_source = ls as LeadSource;
    }
  }

  const data: CustomerInsert | null = errors.length === 0
    ? {
        id: '',
        name,
        email,
        phone,
        address: (raw.address ?? '').trim() || null,
        attention_to: (raw.attention_to ?? '').trim() || null,
        type,
        status,
        joined,
        lead_source,
        notes: (raw.notes ?? '').trim() || null,
      }
    : null;

  return { raw, data, errors };
}

export function CustomerImportModal({ onClose }: Props) {
  const createMut = useCreateCustomer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [importErrors, setImportErrors] = useState<{ name: string; reason: string }[]>([]);
  const [done, setDone] = useState(false);

  const validRows = useMemo(() => rows.filter((r) => r.errors.length === 0), [rows]);
  const invalidRows = useMemo(() => rows.filter((r) => r.errors.length > 0), [rows]);

  const handleDownloadTemplate = () => {
    const csv = buildTemplateCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setImported(0);
    setImportErrors([]);
    setDone(false);
    setFileName(file.name);
    try {
      const text = await file.text();
      const records = parseCsv(text);
      if (records.length === 0) {
        setParseError('CSV has no data rows. Did you include the header row?');
        setRows([]);
        return;
      }
      // Check the header row contains at least 'name'
      const sample = records[0];
      if (!('name' in sample)) {
        setParseError('Missing required column "name". Use the downloaded template.');
        setRows([]);
        return;
      }
      setRows(records.map(validateRow));
    } catch (e) {
      setParseError((e as Error).message ?? 'Could not read file.');
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportErrors([]);
    setImported(0);
    let success = 0;
    const errs: { name: string; reason: string }[] = [];
    for (const r of validRows) {
      if (!r.data) continue;
      try {
        await createMut.mutateAsync(r.data);
        success += 1;
        setImported(success);
      } catch (e) {
        errs.push({ name: r.data.name, reason: (e as Error).message ?? 'Insert failed' });
      }
    }
    setImportErrors(errs);
    setIsImporting(false);
    setDone(true);
  };

  return (
    <Modal title="Bulk Import Customers" subtitle="Download the template, fill it in, then upload" onClose={onClose} width={780}>
      {/* Step 1 — template */}
      <div style={{ background: C.seasalt, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 4 }}>1 · Download the template</div>
          <div style={{ fontSize: 11, color: C.slate, lineHeight: 1.5 }}>
            A blank CSV with two example rows. Required column: <strong style={{ color: C.ink }}>name</strong>. Others are optional and fall back to sensible defaults (type=Residential, status=Active, joined=today).
          </div>
        </div>
        <button
          onClick={handleDownloadTemplate}
          style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.green}`, background: C.white, color: C.green, fontFamily: 'Figtree', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Download template
        </button>
      </div>

      {/* Step 2 — upload */}
      <div style={{ background: C.seasalt, borderRadius: 12, padding: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 6 }}>2 · Upload the filled-in CSV</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            // Reset value so re-selecting the same file fires onChange.
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.ink, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: isImporting ? 'not-allowed' : 'pointer' }}
          >
            Choose file…
          </button>
          <span style={{ fontSize: 12, color: C.slate }}>
            {fileName ?? 'No file selected.'}
          </span>
        </div>
        {parseError && (
          <div style={{ marginTop: 10, fontSize: 12, color: C.error, fontWeight: 600, padding: '8px 10px', background: C.errorBg, borderRadius: 8 }}>
            {parseError}
          </div>
        )}
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div>
          <label style={labelStyle}>Preview ({validRows.length} valid · {invalidRows.length} skipped)</label>
          <div style={{ maxHeight: 280, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 10, background: C.white }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead style={{ position: 'sticky', top: 0, background: C.seasalt }}>
                <tr>
                  {['Name', 'Email', 'Phone', 'Type', 'Joined', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${C.divider}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const ok = r.errors.length === 0;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.divider}`, background: ok ? 'transparent' : '#FFFAFA' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: ok ? C.ink : C.error }}>
                        {ok ? '✓' : '✗'} {r.raw.name || <span style={{ color: C.slate, fontWeight: 400 }}>(blank)</span>}
                      </td>
                      <td style={{ padding: '7px 10px', color: C.slate }}>{r.raw.email || '—'}</td>
                      <td style={{ padding: '7px 10px', color: C.slate }}>{r.raw.phone || '—'}</td>
                      <td style={{ padding: '7px 10px', color: C.slate }}>{r.raw.type || 'Residential'}</td>
                      <td style={{ padding: '7px 10px', color: C.slate }}>{r.raw.joined || 'today'}</td>
                      <td style={{ padding: '7px 10px', color: ok ? C.green : C.error, fontWeight: 600 }}>
                        {ok ? r.raw.status || 'Active' : r.errors.join('; ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {done && (
        <div style={{ background: importErrors.length === 0 ? C.honeydew : '#FFF8E1', borderRadius: 10, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: importErrors.length === 0 ? C.green : '#B07D00' }}>
          Imported {imported} of {validRows.length} customers.
          {importErrors.length > 0 && (
            <ul style={{ margin: '6px 0 0 16px', padding: 0, fontWeight: 500 }}>
              {importErrors.map((e, i) => (
                <li key={i}>{e.name}: {e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onClose}
          disabled={isImporting}
          style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: isImporting ? 'not-allowed' : 'pointer', marginLeft: 'auto' }}
        >
          {done ? 'Close' : 'Cancel'}
        </button>
        {!done && (
          <button
            onClick={handleImport}
            disabled={validRows.length === 0 || isImporting}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: validRows.length === 0 || isImporting ? C.slate : C.green,
              color: C.white,
              fontFamily: 'Figtree',
              fontSize: 13,
              fontWeight: 700,
              cursor: validRows.length === 0 || isImporting ? 'not-allowed' : 'pointer',
              opacity: validRows.length === 0 || isImporting ? 0.6 : 1,
            }}
          >
            {isImporting ? `Importing… ${imported}/${validRows.length}` : `Import ${validRows.length}`}
          </button>
        )}
      </div>
    </Modal>
  );
}
