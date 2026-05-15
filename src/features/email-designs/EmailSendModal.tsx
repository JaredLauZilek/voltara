import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { useCompanyProfile } from '@/features/form-designs';
import { useEmailDesign } from './hooks';
import { renderEmailHtml } from './render';
import { sendDocEmail } from './send';
import type { DocType, PlaceholderContext } from './types';

interface Props {
  docType: DocType;
  recipient: { name: string; email: string | null };
  subtitle?: string;
  context: PlaceholderContext;
  /** The @react-pdf document element to render and attach. */
  pdfDocument: ReactElement;
  pdfFileName: string;
  storagePathPrefix: string;
  onClose: () => void;
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
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
};

export function EmailSendModal({
  docType,
  recipient,
  subtitle,
  context,
  pdfDocument,
  pdfFileName,
  storagePathPrefix,
  onClose,
}: Props) {
  const buildPdfBlob = async (): Promise<Blob> => pdf(pdfDocument).toBlob();
  const companyProfileQ = useCompanyProfile();
  const { profile, design, isLoading } = useEmailDesign(docType);

  const [to, setTo] = useState(recipient.email ?? '');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const rendered = useMemo(() => {
    if (!design || !profile) return null;
    return renderEmailHtml({
      design,
      profile,
      ctx: context,
      brandColor: companyProfileQ.data?.brand_color,
      logoDataUrl: design.show_logo ? companyProfileQ.data?.logo_data_url ?? null : null,
    });
  }, [design, profile, context, companyProfileQ.data]);

  useEffect(() => {
    if (rendered && !subjectDraft) setSubjectDraft(rendered.subject);
  }, [rendered, subjectDraft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, isSending]);


  const ready = !isLoading && !!profile && !!design && !!rendered && to.includes('@');

  const handleSend = async () => {
    if (!ready || !design || !profile) return;
    setError(null);
    setIsSending(true);
    try {
      await sendDocEmail({
        to,
        subjectOverride: subjectDraft,
        design,
        profile,
        ctx: context,
        brandColor: companyProfileQ.data?.brand_color,
        logoDataUrl: design.show_logo ? companyProfileQ.data?.logo_data_url ?? null : null,
        buildPdfBlob,
        pdfFileName,
        storagePathPrefix,
      });
      setSuccess(true);
    } catch (e) {
      setError((e as Error).message ?? 'Send failed.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal title="Send via Email" subtitle={subtitle} onClose={onClose}>
      <div style={{ background: C.seasalt, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{recipient.name}</div>
        <div style={{ fontSize: 11, color: C.slate }}>
          {recipient.email ?? <span style={{ color: '#C0321A', fontWeight: 600 }}>No email on file — enter one below</span>}
        </div>
      </div>

      <div>
        <label style={labelStyle}>From</label>
        <input
          type="text"
          value={rendered?.from ?? '—'}
          readOnly
          style={{ ...inputStyle, background: C.seasalt, color: C.slate, cursor: 'not-allowed' }}
        />
        <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
          Edit From / Reply-To / CC / BCC under Settings → Email Designs.
        </div>
      </div>

      <div>
        <label style={labelStyle}>To</label>
        <input
          type="email"
          value={to}
          placeholder="customer@example.com"
          onChange={(e) => setTo(e.target.value)}
          disabled={isSending || success}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Subject</label>
        <input
          type="text"
          value={subjectDraft}
          onChange={(e) => setSubjectDraft(e.target.value)}
          disabled={isSending || success}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...labelStyle, marginBottom: 0 }}>Preview</span>
          <button
            onClick={() => setShowHtmlPreview((v) => !v)}
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.slate,
              fontFamily: 'Figtree',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showHtmlPreview ? 'Hide' : 'Show'}
          </button>
        </div>
        {showHtmlPreview && rendered && (
          <iframe
            title="Email preview"
            srcDoc={rendered.html}
            sandbox=""
            style={{
              width: '100%',
              height: 360,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.seasalt,
            }}
          />
        )}
        {showHtmlPreview && design?.attach_pdf && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ ...labelStyle, marginBottom: 0 }}>Attachment</span>
              <span style={{ fontSize: 11, color: C.slate }}>
                — the {docType.replace('_', ' ')} PDF the customer will receive
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 540,
              borderRadius: 12,
              background: '#525659',
              overflow: 'hidden',
            }}>
              <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
                {pdfDocument}
              </PDFViewer>
            </div>
          </>
        )}
        {!showHtmlPreview && design?.attach_pdf && (
          <div style={{ fontSize: 11, color: C.slate }}>
            The {docType.replace('_', ' ')} PDF will be attached automatically.
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '10px 12px', background: '#FDEAEA', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ fontSize: 12, color: C.green, fontWeight: 600, padding: '10px 12px', background: C.honeydew, borderRadius: 8 }}>
          Sent. Resend has accepted the message.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={onClose}
          disabled={isSending}
          style={{
            marginLeft: 'auto',
            padding: '10px 20px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.slate,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 600,
            cursor: isSending ? 'not-allowed' : 'pointer',
            opacity: isSending ? 0.5 : 1,
          }}
        >
          {success ? 'Close' : 'Cancel'}
        </button>
        {!success && (
          <button
            onClick={handleSend}
            disabled={!ready || isSending}
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              border: 'none',
              background: !ready ? C.slate : C.green,
              color: C.white,
              fontFamily: 'Figtree',
              fontSize: 13,
              fontWeight: 700,
              cursor: !ready || isSending ? 'not-allowed' : 'pointer',
              opacity: isSending ? 0.7 : 1,
            }}
          >
            {isSending ? 'Sending…' : 'Send Email'}
          </button>
        )}
      </div>
    </Modal>
  );
}
