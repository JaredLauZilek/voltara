// Per-period variant of InvoicePrefillField. Same Anthropic-vision pipeline,
// but the parsed fields write to the period only (amount/paid_on/reference)
// — entity and category stay locked at the parent. Supports multiple
// attachments per period (drop several files; AI parses the first one).

import { useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import { supabase } from '@/shared/lib/supabase';
import type { Attachment } from '@/shared/types';
import { useExpenseCategories } from '../hooks';
import { parseExpenseInvoice } from '../lib/parseInvoice';

interface PeriodPrefillFields {
  amount: number | null;
  expense_date: string | null;     // becomes period.paid_on
  reference: string | null;
}

interface Props {
  /** Folder prefix in the 'attachments' bucket — e.g. "expenses/EXP-123/period-2026-02". */
  storagePath: string;
  /** Existing per-period attachments — shown as a list below the drop-zone. */
  attachments: Attachment[];
  /** Caller writes the new array back (after add/remove). */
  onAttachmentsChange: (next: Attachment[]) => void;
  /** Caller applies the parsed fields onto the period. */
  onApply: (args: { fields: PeriodPrefillFields; attachment: Attachment }) => void;
  /** Parent expense's currency — periods inherit it; shown on the amount chip
   *  so the user sees `USD 144.00` rather than `RM 144.00` when the parent
   *  is a USD subscription. */
  baselineCurrency: string;
}

const BUCKET = 'attachments';
const MAX_BYTES = 5_000_000;
const ACCEPTED = 'application/pdf,image/png,image/jpeg';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function safeFile(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function deriveExt(mime: string, filename: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  const m = filename.match(/\.([a-z0-9]+)$/i);
  return m?.[1] ?? 'bin';
}

export function PeriodInvoicePrefillField({
  storagePath,
  attachments,
  onAttachmentsChange,
  onApply,
  baselineCurrency,
}: Props) {
  // Categories list is needed by `parseExpenseInvoice` so the model can
  // still surface a category guess server-side — but periods don't apply
  // it, so we discard the value here. Entities aren't matched at the
  // period level (parent owns the entity), so we pass an empty list.
  const { data: categories = [] } = useExpenseCategories();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'reading' | 'parsed' | 'applying' | 'error'>('idle');
  const [parsed, setParsed] = useState<PeriodPrefillFields | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(`"${file.name}" exceeds 5 MB.`);
      setStage('error');
      return;
    }
    setPendingFile(file);
    setStage('reading');
    try {
      const result = await parseExpenseInvoice(file, [], categories);
      setParsed({
        amount: result.amount,
        expense_date: result.expense_date,
        reference: result.reference,
      });
      setStage('parsed');
    } catch (e) {
      setError(`Couldn't read invoice: ${(e as Error).message}`);
      setStage('error');
    }
  };

  const removeField = (key: keyof PeriodPrefillFields) => {
    setParsed((p) => (p ? { ...p, [key]: null } : p));
  };

  const handleApply = async () => {
    if (!pendingFile || !parsed) return;
    setStage('applying');
    setError(null);
    try {
      const ext = deriveExt(pendingFile.type, pendingFile.name);
      const path = `${storagePath}/${uid()}-${safeFile(pendingFile.name)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (upErr) throw upErr;
      const attachment: Attachment = {
        name: pendingFile.name,
        mime: pendingFile.type,
        storage_path: path,
        size: pendingFile.size,
        uploaded_at: new Date().toISOString(),
      };
      onApply({ fields: parsed, attachment });
      setStage('idle');
      setParsed(null);
      setPendingFile(null);
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
      setStage('parsed');
    }
  };

  const handleRemoveAttachment = async (att: Attachment) => {
    await supabase.storage.from(BUCKET).remove([att.storage_path]);
    onAttachmentsChange(attachments.filter((a) => a.storage_path !== att.storage_path));
  };

  const cancelParsed = () => {
    setStage('idle');
    setParsed(null);
    setPendingFile(null);
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {stage === 'idle' && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            style={{
              border: `2px dashed ${isDragging ? C.green : C.border}`,
              borderRadius: 10,
              padding: '14px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? C.honeydew : C.seasalt,
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
              📎 Drag & drop or <span style={{ textDecoration: 'underline' }}>browse</span> this period's invoice
            </div>
            <div style={{ fontSize: 10, color: C.slate, marginTop: 4 }}>
              PDF, PNG, or JPG · max 5 MB · AI fills this period's amount / paid date / ref
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </>
      )}

      {stage === 'reading' && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: C.seasalt, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>
            Reading {pendingFile?.name}…
          </div>
        </div>
      )}

      {stage === 'parsed' && parsed && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: C.white, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Detected for this period</div>
            <span style={{ fontSize: 10, color: C.slate }}>{pendingFile?.name}</span>
          </div>
          <PeriodChips parsed={parsed} onRemove={removeField} currency={baselineCurrency} />
          {error && <div style={{ fontSize: 11, color: '#C0321A', fontWeight: 600 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={cancelParsed}
              style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Apply &amp; attach
            </button>
          </div>
        </div>
      )}

      {stage === 'applying' && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: C.seasalt, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Uploading…</div>
        </div>
      )}

      {stage === 'error' && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FDEAEA', border: '1px solid #FDEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#C0321A', fontWeight: 600 }}>{error}</span>
          <button
            type="button"
            onClick={() => { setStage('idle'); setError(null); }}
            style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.slate, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Attached files list — shown under the drop-zone, supports multiple. */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {attachments.map((att) => (
            <div
              key={att.storage_path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: C.honeydew,
                border: `1px solid ${C.green}`,
              }}
            >
              <span style={{ fontSize: 13 }}>{att.mime === 'application/pdf' ? '📄' : '🖼️'}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: C.green, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {att.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att)}
                style={{ border: 'none', background: 'transparent', color: '#C0321A', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Figtree' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PeriodChips({
  parsed,
  onRemove,
  currency,
}: {
  parsed: PeriodPrefillFields;
  onRemove: (key: keyof PeriodPrefillFields) => void;
  currency: string;
}) {
  const chips: { key: keyof PeriodPrefillFields; label: string; value: string }[] = [];
  if (parsed.amount !== null) chips.push({ key: 'amount', label: 'Amount', value: `${currency} ${parsed.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` });
  if (parsed.expense_date) chips.push({ key: 'expense_date', label: 'Paid on', value: parsed.expense_date });
  if (parsed.reference) chips.push({ key: 'reference', label: 'Ref', value: parsed.reference });

  if (chips.length === 0) {
    return (
      <div style={{ fontSize: 11, color: C.slate, fontStyle: 'italic' }}>
        Couldn't detect amount/date/ref. Apply will still attach the file.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {chips.map((c) => (
        <span
          key={c.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 6px 3px 10px',
            background: C.honeydew,
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          <span style={{ color: C.slate, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 9 }}>
            {c.label}
          </span>
          <span style={{ color: C.green }}>{c.value}</span>
          <button
            type="button"
            onClick={() => onRemove(c.key)}
            title="Remove this detection"
            style={{
              marginLeft: 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: C.slate,
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
              fontFamily: 'Figtree',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FDEAEA';
              e.currentTarget.style.color = '#C0321A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = C.slate;
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: `2px solid ${C.border}`,
        borderTopColor: C.green,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
