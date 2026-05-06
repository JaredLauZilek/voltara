import { C } from '@/shared/tokens';
import { ColorInput } from './ColorInput';
import { COLUMN_LABELS, DOC_TYPES } from './types';
import type { FormDesign, DocType, ColumnVisibility } from './types';

interface Props {
  docType: DocType;
  draft: FormDesign;
  onChange: (patch: Partial<FormDesign>) => void;
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

export function DocDesignPanel({ docType, draft, onChange }: Props) {
  const docLabel = DOC_TYPES.find((d) => d.id === docType)?.label ?? docType;

  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{docLabel} Settings</div>
        <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
          Overrides for this document type only.
        </div>
      </div>

      <div>
        <label style={labelStyle}>Header Note</label>
        <textarea
          value={draft.header_note ?? ''}
          onChange={(e) => onChange({ header_note: e.target.value || null })}
          rows={2}
          placeholder="Optional banner under the title — e.g. 'Quotation valid for 30 days from issue.'"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      {docType === 'invoice' && (
        <div>
          <label style={labelStyle}>Payment Instructions</label>
          <textarea
            value={draft.payment_instructions ?? ''}
            onChange={(e) => onChange({ payment_instructions: e.target.value || null })}
            rows={3}
            placeholder="Payment due within 30 days. Bank details shown below."
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      )}

      <div>
        <label style={labelStyle}>Terms & Conditions</label>
        <textarea
          value={draft.terms_text ?? ''}
          onChange={(e) => onChange({ terms_text: e.target.value || null })}
          rows={4}
          placeholder="Standard terms shown at the bottom of every exported document."
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label style={labelStyle}>Footer Text</label>
        <textarea
          value={draft.footer_text ?? ''}
          onChange={(e) => onChange({ footer_text: e.target.value || null })}
          rows={2}
          placeholder="Thank you for your business · voltara.com.my"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label style={labelStyle}>Accent Colour Override</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ColorInput
            value={draft.accent_color ?? ''}
            onChange={(hex) => onChange({ accent_color: hex || null })}
            allowClear
          />
          <span style={{ fontSize: 11, color: C.slate }}>
            {draft.accent_color ? 'Overrides brand colour for this doc only' : 'Inheriting brand colour'}
          </span>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Sections to Show</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <Toggle label="Logo"                checked={draft.show_logo}             onChange={(v) => onChange({ show_logo: v })} />
          <Toggle label="Company Address"     checked={draft.show_company_address}  onChange={(v) => onChange({ show_company_address: v })} />
          <Toggle label="Customer / Vendor"   checked={draft.show_customer_address} onChange={(v) => onChange({ show_customer_address: v })} />
          <Toggle label="Notes"               checked={draft.show_notes}            onChange={(v) => onChange({ show_notes: v })} />
          <Toggle label="Signature Block"     checked={draft.show_signature_block}  onChange={(v) => onChange({ show_signature_block: v })} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Line Item Columns</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibility)[]).map((key) => {
            const active = draft.column_visibility[key];
            return (
              <button
                key={key}
                onClick={() => onChange({ column_visibility: { ...draft.column_visibility, [key]: !active } })}
                style={{
                  padding: '6px 14px',
                  borderRadius: 99,
                  border: `2px solid ${active ? C.green : C.border}`,
                  background: active ? C.honeydew : C.white,
                  color: active ? C.green : C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {COLUMN_LABELS[key]}
              </button>
            );
          })}
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
