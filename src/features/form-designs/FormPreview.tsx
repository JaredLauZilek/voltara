import { C } from '@/shared/tokens';
import type { CompanyProfile, FormDesign, DocType } from './types';

interface Props {
  profile: CompanyProfile;
  design: FormDesign;
  docType: DocType;
}

const SAMPLE_CUSTOMER = {
  name: 'ABC Sdn Bhd',
  address: 'Lot 12, Jalan Industri 3/8, 47100 Puchong, Selangor',
  attention: 'Encik Ahmad Faizal',
};

const SAMPLE_LINE_ITEMS = [
  { sku: 'SKU-10421', description: '7kW AC Wall Charger — Type 2',                           qty: 2, unit_price: 4_500.00 },
  { sku: 'SKU-10538', description: 'Installation Cable Pack (10m, 32A)',                     qty: 2,   unit_price: 350.00 },
  { sku: 'SVC-22001', description: 'Site survey + commissioning (includes test certificate)', qty: 1, unit_price: 1_200.00 },
];

const TITLE_BY_TYPE: Record<DocType, string> = {
  invoice:         'INVOICE',
  quote:           'QUOTATION',
  delivery_order:  'DELIVERY ORDER',
  purchase_order:  'PURCHASE ORDER',
  receipt:         'OFFICIAL RECEIPT',
};

const REF_BY_TYPE: Record<DocType, string> = {
  invoice:         'INV-2026-0042',
  quote:           'Q-2026-018',
  delivery_order:  'DO-2026-009',
  purchase_order:  'PO-2026-014',
  receipt:         'INV-2026-0042',
};

export function FormPreview({ profile, design, docType }: Props) {
  const accent = design.accent_color || profile.brand_color;
  const fontStack = profile.font_family === 'Figtree'
    ? '"Figtree", system-ui, sans-serif'
    : `"${profile.font_family}", serif`;

  const subtotal = SAMPLE_LINE_ITEMS.reduce((s, li) => s + li.qty * li.unit_price, 0);
  const tax = design.column_visibility.tax ? subtotal * 0.08 : 0;
  const total = subtotal + tax;

  return (
    <div
      style={{
        background: C.white,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: 28,
        fontFamily: fontStack,
        fontSize: 11,
        color: '#1a1a1a',
        minHeight: 600,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header — logo + company info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        {design.show_logo && profile.logo_data_url ? (
          <img src={profile.logo_data_url} alt="Logo" style={{ height: 40, maxWidth: 130, objectFit: 'contain', objectPosition: 'left center' }} />
        ) : design.show_logo ? (
          <div style={{ width: 120, height: 60, background: C.seasalt, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C.slate }}>
            (logo)
          </div>
        ) : <div />}

        {design.show_company_address && (
          <div style={{ textAlign: 'right', lineHeight: 1.45 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>{profile.company_name}</div>
            {profile.address       && <div style={{ whiteSpace: 'pre-wrap' }}>{profile.address}</div>}
            {profile.registration_no && <div>Reg: {profile.registration_no}</div>}
            {profile.tax_id        && <div>SST: {profile.tax_id}</div>}
            {profile.phone         && <div>{profile.phone}</div>}
            {profile.email         && <div>{profile.email}</div>}
            {profile.website       && <div>{profile.website}</div>}
          </div>
        )}
      </div>

      {/* Title bar */}
      <div style={{ marginTop: 24, paddingBottom: 12, borderBottom: `2px solid ${accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '0.04em' }}>
            {TITLE_BY_TYPE[docType]}
          </div>
          <div style={{ fontSize: 11, color: C.slate }}>
            <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{REF_BY_TYPE[docType]}</span>
            <span style={{ marginLeft: 12 }}>Date: 06 May 2026</span>
          </div>
        </div>
      </div>

      {/* Customer block */}
      {design.show_customer_address && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {docType === 'purchase_order' ? 'Vendor' : docType === 'delivery_order' ? 'Deliver To' : 'Bill To'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{SAMPLE_CUSTOMER.name}</div>
          <div style={{ color: C.slate, marginTop: 2, lineHeight: 1.45 }}>{SAMPLE_CUSTOMER.address}</div>
          <div style={{ color: C.slate, fontSize: 10, marginTop: 2 }}>Attn: {SAMPLE_CUSTOMER.attention}</div>
        </div>
      )}

      {/* Header note */}
      {design.header_note && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: C.seasalt, borderRadius: 8, fontSize: 11, lineHeight: 1.5 }}>
          {design.header_note}
        </div>
      )}

      {/* Line items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18, fontSize: 10 }}>
        <thead>
          <tr style={{ background: accent, color: C.white }}>
            {design.column_visibility.sku         && <th style={th}>SKU</th>}
            {design.column_visibility.description && <th style={{ ...th, textAlign: 'left' }}>Description</th>}
            {design.column_visibility.qty         && <th style={{ ...th, textAlign: 'center', width: 50 }}>Qty</th>}
            {design.column_visibility.unit_price  && <th style={{ ...th, textAlign: 'right', width: 90 }}>Unit Price</th>}
            {design.column_visibility.tax         && <th style={{ ...th, textAlign: 'right', width: 60 }}>Tax</th>}
            {design.column_visibility.line_total  && <th style={{ ...th, textAlign: 'right', width: 90 }}>Total</th>}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_LINE_ITEMS.map((li, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.divider}` }}>
              {design.column_visibility.sku         && <td style={td}>{li.sku}</td>}
              {design.column_visibility.description && <td style={{ ...td, textAlign: 'left' }}>{li.description}</td>}
              {design.column_visibility.qty         && <td style={{ ...td, textAlign: 'center' }}>{li.qty}</td>}
              {design.column_visibility.unit_price  && <td style={{ ...td, textAlign: 'right' }}>RM {li.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
              {design.column_visibility.tax         && <td style={{ ...td, textAlign: 'right' }}>8%</td>}
              {design.column_visibility.line_total  && <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>RM {(li.qty * li.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ minWidth: 220 }}>
          <Row label="Subtotal" value={`RM ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          {design.column_visibility.tax && (
            <Row label="Tax (8%)" value={`RM ${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          )}
          <div style={{ marginTop: 6, paddingTop: 8, borderTop: `2px solid ${accent}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>TOTAL</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>
              RM {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {design.show_notes && (
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.divider}` }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 10, color: C.slate, lineHeight: 1.5 }}>
            Sample notes appear here when an actual {docType.replace('_', ' ')} is exported.
          </div>
        </div>
      )}

      {/* Payment instructions (invoice only) */}
      {docType === 'invoice' && design.payment_instructions && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: C.honeydew, borderRadius: 8, fontSize: 10, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, color: accent, marginBottom: 4 }}>Payment Instructions</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{design.payment_instructions}</div>
          {profile.bank_details && (
            <div style={{ marginTop: 6, color: C.slate, whiteSpace: 'pre-wrap' }}>{profile.bank_details}</div>
          )}
        </div>
      )}

      {/* Terms */}
      {design.terms_text && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Terms & Conditions</div>
          <div style={{ fontSize: 9, color: C.slate, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{design.terms_text}</div>
        </div>
      )}

      {/* Signature block */}
      {design.show_signature_block && (
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <SignatureBox label="Authorised Signature" />
          <SignatureBox label="Customer Acknowledgement" />
        </div>
      )}

      {/* Footer */}
      {design.footer_text && (
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${C.divider}`, fontSize: 9, color: C.slate, textAlign: 'center', whiteSpace: 'pre-wrap' }}>
          {design.footer_text}
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 9,
  fontWeight: 700,
  textAlign: 'center',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};
const td: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 10,
  textAlign: 'center',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10 }}>
      <span style={{ color: C.slate }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div>
      <div style={{ height: 50, borderBottom: `1px solid ${C.slate}` }} />
      <div style={{ marginTop: 4, fontSize: 9, color: C.slate, textAlign: 'center' }}>{label}</div>
    </div>
  );
}
