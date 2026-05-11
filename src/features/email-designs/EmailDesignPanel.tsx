import { C } from '@/shared/tokens';
import { DOC_TYPES } from '@/features/form-designs';
import { PLACEHOLDER_TOKENS } from './types';
import type { EmailDesign, DocType } from './types';

interface Props {
  docType: DocType;
  draft: EmailDesign;
  onChange: (patch: Partial<EmailDesign>) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
  background: C.white,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};

export function EmailDesignPanel({ docType, draft, onChange }: Props) {
  const docLabel = DOC_TYPES.find((d) => d.id === docType)?.label ?? docType;

  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{docLabel} Email Content</div>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
          Structured fields wrapped in HTML by the renderer. Use placeholder tokens for dynamic values.
        </div>
      </div>

      <div>
        <label style={labelStyle}>Subject</label>
        <input
          type="text"
          value={draft.subject_template}
          onChange={(e) => onChange({ subject_template: e.target.value })}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Intro Paragraph</label>
        <textarea
          value={draft.intro_text ?? ''}
          rows={3}
          placeholder="Shown above the document summary. Address the recipient and set context."
          onChange={(e) => onChange({ intro_text: e.target.value || null })}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Body Paragraph</label>
        <textarea
          value={draft.body_text ?? ''}
          rows={4}
          placeholder="Shown below the document summary. Use it for instructions, payment terms, or next steps."
          onChange={(e) => onChange({ body_text: e.target.value || null })}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Signature (Overrides Company Default)</label>
        <textarea
          value={draft.signature_text ?? ''}
          rows={3}
          placeholder="Leave blank to inherit the company default signature."
          onChange={(e) => onChange({ signature_text: e.target.value || null })}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Footer Text</label>
        <textarea
          value={draft.footer_text ?? ''}
          rows={2}
          placeholder="Small print at the very bottom — disclaimer, unsubscribe info, or company address."
          onChange={(e) => onChange({ footer_text: e.target.value || null })}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Accent Colour</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="color"
            value={draft.accent_color || '#1B512D'}
            onChange={(e) => onChange({ accent_color: e.target.value })}
            style={{ width: 44, height: 32, border: `1px solid ${C.border}`, borderRadius: 8, padding: 0, cursor: 'pointer' }}
          />
          <input
            type="text"
            value={draft.accent_color ?? ''}
            placeholder="#1B512D (inherits brand colour)"
            onChange={(e) => onChange({ accent_color: e.target.value || null })}
            style={{ ...inputStyle, flex: 1 }}
          />
          {draft.accent_color && (
            <button
              onClick={() => onChange({ accent_color: null })}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                color: C.slate,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div>
        <label style={labelStyle}>Options</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Toggle label="Attach PDF"        checked={draft.attach_pdf}       onChange={(v) => onChange({ attach_pdf: v })} />
          <Toggle label="Show Logo"         checked={draft.show_logo}        onChange={(v) => onChange({ show_logo: v })} />
          <Toggle label="Document Summary"  checked={draft.show_doc_summary} onChange={(v) => onChange({ show_doc_summary: v })} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Placeholders Available</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PLACEHOLDER_TOKENS.map((token) => (
            <span
              key={token}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: 11,
                fontWeight: 600,
                color: C.green,
                background: C.honeydew,
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              {token}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.slate, marginTop: 6 }}>
          Tokens are substituted at send time with values from the customer / document / company.
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 10,
        border: `1px solid ${checked ? C.green : C.border}`,
        background: checked ? C.honeydew : C.white,
        color: checked ? C.green : C.slate,
        fontFamily: 'Figtree',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{
        width: 14,
        height: 14,
        borderRadius: 4,
        border: `2px solid ${checked ? C.green : C.slate}`,
        background: checked ? C.green : 'transparent',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: C.white,
        fontSize: 10,
        fontWeight: 800,
        flexShrink: 0,
      }}>
        {checked ? '✓' : ''}
      </span>
      {label}
    </button>
  );
}
