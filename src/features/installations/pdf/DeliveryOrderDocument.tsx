import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Customer } from '@/features/customers';
import type { Product } from '@/features/products';
import type { Quote } from '@/features/sales';
import type { Installation } from '../types';

interface Props {
  installation: Installation;
  quote: Quote | null;
  customer: Customer | null;
  products: Product[];
  profile: CompanyProfile;
  design: FormDesign;
}

/**
 * Pure HTML markup for a Delivery Order. Rendered to a string via
 * `react-dom/server` and printed inside an iframe. No interactivity.
 */
export function DeliveryOrderDocument({ installation, quote, customer, products, profile, design }: Props) {
  const accent = design.accent_color || profile.brand_color;
  const productById = new Map(products.map((p) => [p.id, p]));
  const lineItems = quote?.line_items ?? [];

  const fontStack = profile.font_family === 'Figtree'
    ? '"Figtree", system-ui, sans-serif'
    : `"${profile.font_family}", serif`;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Delivery Order — {installation.id}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" />
        <style>{`
          @page { size: ${profile.paper_size}; margin: 16mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: ${fontStack}; font-size: 11px; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 8px 10px; font-size: 10px; }
          th { font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; font-size: 9px; }
          @media screen {
            body { background: #F9F9F9; padding: 24px; }
            .page { background: #FFFFFF; max-width: 800px; margin: 0 auto; padding: 28px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); border-radius: 12px; }
          }
          @media print {
            .page { padding: 0; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          {/* Header — logo + company info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
            {design.show_logo && profile.logo_data_url ? (
              <img src={profile.logo_data_url} alt="" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} />
            ) : <div />}

            {design.show_company_address && (
              <div style={{ textAlign: 'right', lineHeight: 1.45 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: accent }}>{profile.company_name}</div>
                {profile.address         && <div>{profile.address}</div>}
                {profile.registration_no && <div>Reg: {profile.registration_no}</div>}
                {profile.tax_id          && <div>SST: {profile.tax_id}</div>}
                {profile.phone           && <div>{profile.phone}</div>}
                {profile.email           && <div>{profile.email}</div>}
                {profile.website         && <div>{profile.website}</div>}
              </div>
            )}
          </div>

          {/* Title bar */}
          <div style={{ marginTop: 24, paddingBottom: 12, borderBottom: `2px solid ${accent}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '0.04em' }}>
                DELIVERY ORDER
              </div>
              <div style={{ fontSize: 11, color: '#767B77' }}>
                <span style={{ fontWeight: 700, color: '#1a1a1a' }}>{installation.id}</span>
                <span style={{ marginLeft: 12 }}>Date: {installation.scheduled}</span>
              </div>
            </div>
          </div>

          {/* Customer + reference block */}
          {design.show_customer_address && (
            <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#767B77', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Deliver To
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{customer?.name ?? installation.customer_id}</div>
                {customer?.address && <div style={{ color: '#767B77', marginTop: 2, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{customer.address}</div>}
                {customer?.phone   && <div style={{ color: '#767B77', fontSize: 10, marginTop: 2 }}>{customer.phone}</div>}
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#767B77', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Reference
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                  {quote && <div><strong>Quote / Proposal:</strong> {quote.id} ({quote.type})</div>}
                  <div><strong>Technician:</strong> {installation.tech}</div>
                  <div><strong>Status:</strong> {installation.status}</div>
                </div>
              </div>
            </div>
          )}

          {/* Header note */}
          {design.header_note && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#F9F9F9', borderRadius: 8, fontSize: 11, lineHeight: 1.5 }}>
              {design.header_note}
            </div>
          )}

          {/* Line items table */}
          <table style={{ marginTop: 18 }}>
            <thead>
              <tr style={{ background: accent, color: '#FFFFFF' }}>
                {design.column_visibility.sku         && <th>SKU</th>}
                {design.column_visibility.description && <th style={{ textAlign: 'left' }}>Description</th>}
                {design.column_visibility.qty         && <th style={{ textAlign: 'center', width: 60 }}>Qty</th>}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => {
                const product = productById.get(li.product_id);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F3F3' }}>
                    {design.column_visibility.sku         && <td style={{ textAlign: 'center' }}>{li.product_id}</td>}
                    {design.column_visibility.description && <td>{product?.name ?? li.product_id}{li.description ? ` — ${li.description}` : ''}</td>}
                    {design.column_visibility.qty         && <td style={{ textAlign: 'center', fontWeight: 700 }}>{li.qty}</td>}
                  </tr>
                );
              })}
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#767B77' }}>
                    No line items recorded for this delivery.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Notes */}
          {design.show_notes && installation.notes && (
            <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid #F3F3F3' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#767B77', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Notes</div>
              <div style={{ fontSize: 10, color: '#767B77', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{installation.notes}</div>
            </div>
          )}

          {/* Terms */}
          {design.terms_text && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#767B77', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Terms & Conditions</div>
              <div style={{ fontSize: 9, color: '#767B77', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{design.terms_text}</div>
            </div>
          )}

          {/* Signature block */}
          {design.show_signature_block && (
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              <div>
                <div style={{ height: 50, borderBottom: '1px solid #767B77' }} />
                <div style={{ marginTop: 4, fontSize: 9, color: '#767B77', textAlign: 'center' }}>Delivered By ({installation.tech})</div>
              </div>
              <div>
                <div style={{ height: 50, borderBottom: '1px solid #767B77' }} />
                <div style={{ marginTop: 4, fontSize: 9, color: '#767B77', textAlign: 'center' }}>Received By (Customer)</div>
              </div>
            </div>
          )}

          {/* Footer */}
          {design.footer_text && (
            <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #F3F3F3', fontSize: 9, color: '#767B77', textAlign: 'center', whiteSpace: 'pre-wrap' }}>
              {design.footer_text}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
