import { C } from '@/shared/tokens';
import { ColorInput } from './ColorInput';
import { LogoUploader } from './LogoUploader';
import { FONT_FAMILIES, PAPER_SIZES } from './types';
import type { CompanyProfile } from './types';

interface Props {
  draft: CompanyProfile;
  onChange: (patch: Partial<CompanyProfile>) => void;
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

export function BrandingPanel({ draft, onChange }: Props) {
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Company Branding</div>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
          Shared across all four document types.
        </div>
      </div>

      <div>
        <label style={labelStyle}>Logo</label>
        <LogoUploader value={draft.logo_data_url} onChange={(dataUrl) => onChange({ logo_data_url: dataUrl })} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Company Name</label>
          <input
            value={draft.company_name}
            onChange={(e) => onChange({ company_name: e.target.value })}
            style={inputStyle}
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Address</label>
          <textarea
            value={draft.address ?? ''}
            onChange={(e) => onChange({ address: e.target.value || null })}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <div>
          <label style={labelStyle}>Registration No.</label>
          <input
            value={draft.registration_no ?? ''}
            onChange={(e) => onChange({ registration_no: e.target.value || null })}
            style={inputStyle}
            placeholder="202301012345"
          />
        </div>
        <div>
          <label style={labelStyle}>SST / Tax ID</label>
          <input
            value={draft.tax_id ?? ''}
            onChange={(e) => onChange({ tax_id: e.target.value || null })}
            style={inputStyle}
            placeholder="W10-1234-12345678"
          />
        </div>

        <div>
          <label style={labelStyle}>Phone</label>
          <input
            value={draft.phone ?? ''}
            onChange={(e) => onChange({ phone: e.target.value || null })}
            style={inputStyle}
            placeholder="+60 3-1234 5678"
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={draft.email ?? ''}
            onChange={(e) => onChange({ email: e.target.value || null })}
            style={inputStyle}
            placeholder="hello@voltara.com.my"
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Website</label>
          <input
            value={draft.website ?? ''}
            onChange={(e) => onChange({ website: e.target.value || null })}
            style={inputStyle}
            placeholder="voltara.com.my"
          />
        </div>

        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Bank Details (shown on invoice payment block)</label>
          <textarea
            value={draft.bank_details ?? ''}
            onChange={(e) => onChange({ bank_details: e.target.value || null })}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="Maybank · Voltara Sdn Bhd · 5141 2345 6789"
          />
        </div>

        <div>
          <label style={labelStyle}>Brand Colour</label>
          <ColorInput value={draft.brand_color} onChange={(hex) => onChange({ brand_color: hex })} />
        </div>
        <div>
          <label style={labelStyle}>Font Family</label>
          <select
            value={draft.font_family}
            onChange={(e) => onChange({ font_family: e.target.value as CompanyProfile['font_family'] })}
            style={inputStyle}
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Paper Size</label>
          <select
            value={draft.paper_size}
            onChange={(e) => onChange({ paper_size: e.target.value as CompanyProfile['paper_size'] })}
            style={inputStyle}
          >
            {PAPER_SIZES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
