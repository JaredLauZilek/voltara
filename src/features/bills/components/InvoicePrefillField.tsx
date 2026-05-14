import { useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import { supabase } from '@/shared/lib/supabase';
import { useSuppliers } from '@/features/suppliers';
import type { Attachment } from '@/shared/types';
import { parseInvoice, type ParsedInvoice } from '../lib/parseInvoice';

interface Props {
  /** Folder prefix in the 'attachments' bucket (e.g. "bills/BILL-123456"). */
  storagePath: string;
  /** Apply detected fields to the form + attach the uploaded file. */
  onApply: (args: { fields: ParsedInvoice; attachment: Attachment }) => void;
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
  const { data: suppliers = [] } = useSuppliers();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<'idle' | 'reading' | 'parsed' | 'applying' | 'error'>('idle');
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
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
      const result = await parseInvoice(file, suppliers.map((s) => ({ id: s.id, name: s.name })));
      setParsed(result);
      setStage('parsed');
    } catch (e) {
      setError(`Couldn't read invoice: ${(e as Error).message}`);
      setStage('error');
    }
  };

  const handleApply = async () => {
    if (!pendingFile || !parsed) return;
    setStage('applying');
    setError(null);
    try {
      // Upload to Storage so the file becomes the bill's attachment[0].
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
      setStage('parsed'); // back to chips so user can retry Apply
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

  // ─── Reading / parsed / error states ─────────────────────────────────────
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
              📎 Drag & drop or <span style={{ textDecoration: 'underline' }}>browse</span> the vendor invoice
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
            <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Reading invoice…</div>
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
              Detected from invoice
            </div>
            <span style={{ fontSize: 11, color: C.slate }}>{pendingFile?.name}</span>
          </div>
          <DetectedChips parsed={parsed} suppliers={suppliers} />
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
          <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Uploading invoice…</div>
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

// ─── Detected-fields preview ────────────────────────────────────────────────

function DetectedChips({ parsed, suppliers }: { parsed: ParsedInvoice; suppliers: { id: string; name: string }[] }) {
  const chips: { label: string; value: string }[] = [];
  if (parsed.amount !== null) chips.push({ label: 'Amount', value: `${parsed.currency ?? ''} ${parsed.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim() });
  if (parsed.currency && parsed.amount === null) chips.push({ label: 'Currency', value: parsed.currency });
  if (parsed.tax !== null) chips.push({ label: 'Tax', value: parsed.tax.toLocaleString(undefined, { maximumFractionDigits: 2 }) });
  if (parsed.bill_date) chips.push({ label: 'Bill date', value: parsed.bill_date });
  if (parsed.due_date) chips.push({ label: 'Due date', value: parsed.due_date });
  if (parsed.reference) chips.push({ label: 'Invoice ref', value: parsed.reference });
  if (parsed.supplier_id) {
    const s = suppliers.find((x) => x.id === parsed.supplier_id);
    if (s) chips.push({ label: 'Supplier', value: s.name });
  } else if (parsed.vendor_guess) {
    chips.push({ label: 'Vendor (no match)', value: parsed.vendor_guess });
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
      {chips.map((c, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
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
