import { useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import { supabase } from '@/shared/lib/supabase';
import type { Attachment } from '@/shared/types';
import {
  useCreateExpenseEntity,
  useExpenseCategories,
  useExpenseEntities,
} from '../hooks';
import { parseExpenseInvoice, type ParsedExpenseInvoice } from '../lib/parseInvoice';

interface Props {
  /** Folder prefix in the 'attachments' bucket (e.g. "expenses/EXP-123456"). */
  storagePath: string;
  /** Apply detected fields to the form + attach the uploaded file. */
  onApply: (args: { fields: ParsedExpenseInvoice; attachment: Attachment }) => void;
  /** Show "already attached" indicator + Replace button after user has applied once. */
  attached: Attachment | null;
  /** Remove the current attachment (e.g. user wants a fresh start). */
  onClear: () => void;
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

export function InvoicePrefillField({ storagePath, onApply, attached, onClear }: Props) {
  const { data: entities = [] } = useExpenseEntities();
  const { data: categories = [] } = useExpenseCategories();
  const createEntityMut = useCreateExpenseEntity();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'reading' | 'parsed' | 'applying' | 'error'>('idle');
  const [parsed, setParsed] = useState<ParsedExpenseInvoice | null>(null);
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
      const result = await parseExpenseInvoice(file, entities, categories);
      setParsed(result);
      setStage('parsed');
    } catch (e) {
      setError(`Couldn't read invoice: ${(e as Error).message}`);
      setStage('error');
    }
  };

  /** Null out a single detected field — used by the × on each chip so the
   *  user can drop a wrong value before applying. */
  const removeField = (key: keyof ParsedExpenseInvoice) => {
    setParsed((p) => (p ? { ...p, [key]: null } : p));
  };

  const handleApply = async () => {
    if (!pendingFile || !parsed) return;
    setStage('applying');
    setError(null);
    try {
      // If the model returned a vendor name but no matching entity, create
      // one on the fly so the picker has a value to select. The user can
      // still delete the chip first via the × to skip this.
      let toApply = parsed;
      if (!parsed.entity && parsed.vendor_guess) {
        const name = parsed.vendor_guess.trim();
        if (!entities.includes(name)) {
          await createEntityMut.mutateAsync(name);
        }
        toApply = { ...parsed, entity: name };
      }

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
      onApply({ fields: toApply, attachment });
      setStage('idle');
      setParsed(null);
      setPendingFile(null);
    } catch (e) {
      setError(`Upload failed: ${(e as Error).message}`);
      setStage('parsed');
    }
  };

  const handleClear = () => {
    setStage('idle');
    setParsed(null);
    setPendingFile(null);
    setError(null);
    onClear();
  };

  // ─── Already-attached state ──────────────────────────────────────────────
  if (attached && stage === 'idle') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: C.honeydew, border: `1px solid ${C.green}` }}>
        <span style={{ fontSize: 18 }}>{attached.mime === 'application/pdf' ? '📄' : '🖼️'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Invoice attached: {attached.name}
          </div>
          <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
            Fields below were pre-filled from this file. Edit any of them, then save.
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.slate, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          Replace
        </button>
      </div>
    );
  }

  const showDropzone = stage === 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {showDropzone && (
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            style={{
              border: `2px dashed ${isDragging ? C.green : C.border}`,
              borderRadius: 10,
              padding: '20px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? C.honeydew : C.seasalt,
              transition: 'background 120ms, border-color 120ms',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
              📎 Drag & drop or <span style={{ textDecoration: 'underline' }}>browse</span> the receipt / invoice
            </div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>
              PDF, PNG, or JPG · max 5 MB · best-effort pre-fill, always review before saving
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
        <div style={{ padding: '14px 16px', borderRadius: 10, background: C.seasalt, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Reading receipt…</div>
            <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>
              {pendingFile?.name} · this can take a few seconds for scanned files
            </div>
          </div>
        </div>
      )}

      {stage === 'parsed' && parsed && (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: C.white, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
              Detected from receipt
            </div>
            <span style={{ fontSize: 11, color: C.slate }}>{pendingFile?.name}</span>
          </div>
          <DetectedChips parsed={parsed} onRemove={removeField} />
          {error && (
            <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setStage('idle'); setParsed(null); setPendingFile(null); setError(null); }}
              style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Apply &amp; attach
            </button>
          </div>
        </div>
      )}

      {stage === 'applying' && (
        <div style={{ padding: '14px 16px', borderRadius: 10, background: C.seasalt, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Spinner />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Uploading receipt…</div>
        </div>
      )}

      {stage === 'error' && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FDEAEA', border: '1px solid #FDEAEA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>{error}</span>
          <button
            type="button"
            onClick={() => { setStage('idle'); setError(null); }}
            style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.slate, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function DetectedChips({
  parsed,
  onRemove,
}: {
  parsed: ParsedExpenseInvoice;
  onRemove: (key: keyof ParsedExpenseInvoice) => void;
}) {
  const chips: { key: keyof ParsedExpenseInvoice; label: string; value: string }[] = [];
  // Show the AI-detected currency on the amount chip; fall back to RM only when
  // the model truly couldn't tell. (Was hardcoded RM — silently masked USD/SGD
  // subscriptions even though the model returned the right token.)
  if (parsed.amount !== null) {
    const cur = parsed.currency ?? 'RM';
    chips.push({ key: 'amount', label: 'Amount', value: `${cur} ${parsed.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` });
  }
  // Separate chip when the model detected a non-RM currency without an amount
  // (rare but possible — keeps the override visible / removable).
  if (parsed.currency && parsed.currency !== 'RM' && parsed.amount === null) {
    chips.push({ key: 'currency', label: 'Currency', value: parsed.currency });
  }
  if (parsed.expense_date) chips.push({ key: 'expense_date', label: 'Date', value: parsed.expense_date });
  if (parsed.category) chips.push({ key: 'category', label: 'Category', value: parsed.category });
  if (parsed.reference) chips.push({ key: 'reference', label: 'Ref', value: parsed.reference });
  if (parsed.entity) {
    chips.push({ key: 'entity', label: 'Entity', value: parsed.entity });
  } else if (parsed.vendor_guess) {
    // The × on the vendor_guess chip nulls vendor_guess so Apply won't create a new entity.
    chips.push({ key: 'vendor_guess', label: 'Vendor (no match → will create)', value: parsed.vendor_guess });
  }

  if (chips.length === 0) {
    return (
      <div style={{ fontSize: 12, color: C.slate, fontStyle: 'italic' }}>
        Couldn't auto-detect any fields. Apply will still attach the file — you can fill the form manually.
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
            padding: '4px 6px 4px 10px',
            background: C.honeydew,
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span style={{ color: C.slate, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>
            {c.label}
          </span>
          <span style={{ color: C.green }}>{c.value}</span>
          <button
            type="button"
            onClick={() => onRemove(c.key)}
            title="Remove this detection"
            aria-label={`Remove ${c.label}`}
            style={{
              marginLeft: 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: C.slate,
              cursor: 'pointer',
              fontSize: 13,
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
        width: 18,
        height: 18,
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
