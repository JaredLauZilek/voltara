import { C } from '@/shared/tokens';
import { DOC_TYPES } from '@/features/form-designs';
import type { CompanyEmailProfile, EmailDesign, DocType } from './types';

interface Props {
  docType: DocType;
  draft: EmailDesign;
  profile: CompanyEmailProfile;
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
const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: C.slate,
  marginTop: 4,
};

function Field({
  label, value, placeholder, fallback, onChange,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  fallback: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || null)}
        style={inputStyle}
      />
      <div style={hintStyle}>
        {value
          ? 'Overrides company default for this document type only.'
          : fallback
            ? `Inheriting from company default: ${fallback}`
            : 'No company default set.'}
      </div>
    </div>
  );
}

export function EmailRoutingPanel({ docType, draft, profile, onChange }: Props) {
  const docLabel = DOC_TYPES.find((d) => d.id === docType)?.label ?? docType;

  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{docLabel} Routing</div>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
          Per-document From / Reply-To / CC / BCC. Leave a field blank to inherit the company default.
        </div>
      </div>

      <Field
        label="From Name"
        value={draft.from_name}
        placeholder="e.g. Voltara Sales"
        fallback={profile.default_from_name}
        onChange={(v) => onChange({ from_name: v })}
      />
      <Field
        label="From Address"
        value={draft.from_address}
        placeholder="e.g. quotes@voltara.com.my"
        fallback={profile.default_from_address}
        onChange={(v) => onChange({ from_address: v })}
      />
      <Field
        label="Reply-To"
        value={draft.reply_to}
        placeholder="e.g. sales@voltara.com.my"
        fallback={profile.default_reply_to}
        onChange={(v) => onChange({ reply_to: v })}
      />
      <Field
        label="CC"
        value={draft.cc}
        placeholder="cc1@example.com, cc2@example.com"
        fallback={profile.default_cc}
        onChange={(v) => onChange({ cc: v })}
      />
      <Field
        label="BCC"
        value={draft.bcc}
        placeholder="bcc@example.com"
        fallback={profile.default_bcc}
        onChange={(v) => onChange({ bcc: v })}
      />
    </div>
  );
}
