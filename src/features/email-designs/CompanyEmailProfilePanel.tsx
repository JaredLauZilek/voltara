import { C } from '@/shared/tokens';
import type { CompanyEmailProfile } from './types';

interface Props {
  draft: CompanyEmailProfile;
  onChange: (patch: Partial<CompanyEmailProfile>) => void;
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

export function CompanyEmailProfilePanel({ draft, onChange }: Props) {
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Company Email Defaults</div>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
          Shared across every doc type unless overridden in the design's routing panel below.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div>
          <label style={labelStyle}>Default From Name</label>
          <input
            type="text"
            value={draft.default_from_name}
            onChange={(e) => onChange({ default_from_name: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Default From Address</label>
          <input
            type="text"
            value={draft.default_from_address}
            placeholder="noreply@voltara.com.my"
            onChange={(e) => onChange({ default_from_address: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Default Reply-To</label>
          <input
            type="text"
            value={draft.default_reply_to ?? ''}
            placeholder="sales@voltara.com.my"
            onChange={(e) => onChange({ default_reply_to: e.target.value || null })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Default CC</label>
          <input
            type="text"
            value={draft.default_cc ?? ''}
            placeholder="cc@voltara.com.my"
            onChange={(e) => onChange({ default_cc: e.target.value || null })}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: '1 / span 2' }}>
          <label style={labelStyle}>Default BCC</label>
          <input
            type="text"
            value={draft.default_bcc ?? ''}
            placeholder="archive@voltara.com.my"
            onChange={(e) => onChange({ default_bcc: e.target.value || null })}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Default Signature</label>
        <textarea
          value={draft.default_signature ?? ''}
          rows={4}
          placeholder={'Best regards,\nVoltara Sdn Bhd\n+60 12 345 6789\nvoltara.com.my'}
          onChange={(e) => onChange({ default_signature: e.target.value || null })}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
        />
        <div style={{ fontSize: 11, color: C.slate, marginTop: 4 }}>
          Used by every doc-type design that doesn't define its own signature.
        </div>
      </div>
    </div>
  );
}
