import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Quote } from '../types';
import type { Customer } from '@/features/customers';
import type { Product } from '@/features/products';
import type { SalesManager } from '@/features/sales-managers';

interface Props {
  quote: Quote;
  customer: Customer | null;
  products: Product[];
  salesManager: SalesManager | null;
  profile: CompanyProfile;
  design: FormDesign;
  /** Optional id on the root element. Only the print-portal instance sets this. */
  printId?: string;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtRM(n: number) {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuoteDocument({ quote, customer, products, salesManager, profile, design, printId }: Props) {
  const accent = design.accent_color || profile.brand_color;
  const fontStack = profile.font_family === 'Figtree'
    ? '"Figtree", system-ui, sans-serif'
    : `"${profile.font_family}", serif`;

  const items = quote.line_items.map((li) => {
    const p = products.find((x) => x.id === li.product_id);
    return {
      sku: p?.id ?? li.product_id,
      name: p?.name ?? '—',
      // Per-line override (services only) wins; otherwise fall back to the
      // product's master description from inventory.
      detail: li.description ?? p?.description ?? null,
      qty: li.qty,
      unit_price: li.unit_price_snapshot,
      line_total: li.qty * li.unit_price_snapshot,
    };
  });

  const subtotal = items.reduce((s, li) => s + li.line_total, 0);
  const discountAmt = subtotal * (quote.discount / 100);
  const afterDiscount = subtotal - discountAmt;
  const taxAmt = design.column_visibility.tax ? afterDiscount * 0.08 : 0;
  const total = afterDiscount + taxAmt;

  const docTitle = quote.type === 'Proposal' ? 'PROPOSAL' : 'QUOTATION';
  const SLATE = '#767B77';
  const DIVIDER = '#F3F3F3';

  const cv = design.column_visibility;

  return (
    <div
      id={printId}
      style={{ background: '#fff', padding: 36, fontFamily: fontStack, fontSize: 11, color: '#1a1a1a', minHeight: 900 }}
    >
      {/* PAGE HEADER — repeats on every page in print via position: fixed */}
      <div className="voltara-page-header">
        {/* Logo + company info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          {design.show_logo && profile.logo_data_url ? (
            <img src={profile.logo_data_url} alt="Logo" style={{ height: 40, maxWidth: 130, objectFit: 'contain', objectPosition: 'left center' }} />
          ) : design.show_logo ? (
            <div style={{ width: 80, height: 60 }} />
          ) : <div />}

          {design.show_company_address && (
            <div style={{ textAlign: 'right', lineHeight: 1.5 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>{profile.company_name}</div>
              {profile.address        && <div style={{ color: '#444', whiteSpace: 'pre-wrap' }}>{profile.address}</div>}
              {profile.registration_no && <div style={{ color: '#444' }}>Reg: {profile.registration_no}</div>}
              {profile.tax_id         && <div style={{ color: '#444' }}>SST: {profile.tax_id}</div>}
              {profile.phone          && <div style={{ color: '#444' }}>{profile.phone}</div>}
              {profile.email          && <div style={{ color: '#444' }}>{profile.email}</div>}
              {profile.website        && <div style={{ color: '#444' }}>{profile.website}</div>}
            </div>
          )}
        </div>

        {/* Title bar */}
        <div style={{ marginTop: 18, paddingBottom: 10, borderBottom: `2px solid ${accent}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '0.04em' }}>{docTitle}</div>
            <div style={{ textAlign: 'right', lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700 }}>{quote.id}</div>
              <div style={{ color: '#666', fontSize: 10 }}>Date: {fmtDate(quote.valid_from)}</div>
              <div style={{ color: '#666', fontSize: 10 }}>Valid Until: {fmtDate(quote.valid_to)}</div>
            </div>
          </div>
        </div>

        {/* Customer block */}
        {design.show_customer_address && customer && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              Bill To
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{customer.name}</div>
            {customer.address      && <div style={{ color: '#666', marginTop: 1, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{customer.address}</div>}
            {customer.attention_to && <div style={{ color: '#666', fontSize: 10 }}>Attn: {customer.attention_to}</div>}
            {customer.email        && <div style={{ color: '#666', fontSize: 10 }}>{customer.email}</div>}
          </div>
        )}

        {/* Header note */}
        {design.header_note && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#F9F9F9', borderRadius: 6, fontSize: 10, lineHeight: 1.4 }}>
            {design.header_note}
          </div>
        )}
      </div>

      {/* CONTENT — line items table; column header repeats per page via thead */}
      <div className="voltara-page-content" style={{ marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: accent, color: '#fff' }}>
              {cv.sku         && <th style={th}>SKU</th>}
              {cv.description && <th style={{ ...th, textAlign: 'left' }}>Description</th>}
              {cv.qty         && <th style={{ ...th, textAlign: 'center', width: 50 }}>Qty</th>}
              {cv.unit_price  && <th style={{ ...th, textAlign: 'right', width: 90 }}>Unit Price</th>}
              {cv.tax         && <th style={{ ...th, textAlign: 'right', width: 60 }}>Tax</th>}
              {cv.line_total  && <th style={{ ...th, textAlign: 'right', width: 90 }}>Total</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((li, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${DIVIDER}` }}>
                {cv.sku         && <td style={td}>{li.sku}</td>}
                {cv.description && (
                  <td style={{ ...td, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: 11 }}>{li.name}</div>
                    {li.detail && (
                      <div style={{ marginTop: 5, fontSize: 9, color: '#555', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                        {li.detail}
                      </div>
                    )}
                  </td>
                )}
                {cv.qty         && <td style={{ ...td, textAlign: 'center' }}>{li.qty}</td>}
                {cv.unit_price  && <td style={{ ...td, textAlign: 'right' }}>{fmtRM(li.unit_price)}</td>}
                {cv.tax         && <td style={{ ...td, textAlign: 'right' }}>8%</td>}
                {cv.line_total  && <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmtRM(li.line_total)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TAIL — prepared by, totals, notes, terms, signature, footer text.
         Lives in normal flow, ends up on whichever page content reaches. */}
      <div className="voltara-doc-tail">
        {salesManager && (
          <div style={{ marginTop: 10, fontSize: 10, color: SLATE }}>
            Prepared by: <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{salesManager.name}</span>
            {salesManager.email && <span> · {salesManager.email}</span>}
            {salesManager.phone && <span> · {salesManager.phone}</span>}
          </div>
        )}

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 240 }}>
            <TotalsRow label="Subtotal" value={fmtRM(subtotal)} />
            {quote.discount > 0 && <TotalsRow label={`Discount (${quote.discount}%)`} value={`− ${fmtRM(discountAmt)}`} />}
            {cv.tax && <TotalsRow label="Tax (8%)" value={fmtRM(taxAmt)} />}
            <div style={{ marginTop: 6, paddingTop: 8, borderTop: `2px solid ${accent}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>TOTAL</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>{fmtRM(total)}</span>
            </div>
          </div>
        </div>

        {design.show_notes && quote.notes && (
          <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${DIVIDER}` }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 10, color: SLATE, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{quote.notes}</div>
          </div>
        )}

        {design.terms_text && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: SLATE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Terms & Conditions</div>
            <div style={{ fontSize: 9, color: SLATE, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{design.terms_text}</div>
          </div>
        )}

        {design.show_signature_block && (
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <SigBox label="Authorised Signature" />
            <SigBox label="Customer Acknowledgement" />
          </div>
        )}

        {design.footer_text && (
          <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${DIVIDER}`, fontSize: 9, color: SLATE, whiteSpace: 'pre-wrap' }}>
            {design.footer_text}
          </div>
        )}
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 10px', fontSize: 9, fontWeight: 700,
  textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase',
};
const td: React.CSSProperties = {
  padding: '8px 10px', fontSize: 10, textAlign: 'center',
};

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 10 }}>
      <span style={{ color: '#767B77' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SigBox({ label }: { label: string }) {
  return (
    <div>
      <div style={{ height: 50, borderBottom: '1px solid #767B77' }} />
      <div style={{ marginTop: 4, fontSize: 9, color: '#767B77', textAlign: 'center' }}>{label}</div>
    </div>
  );
}
