import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Quote } from '../types';
import type { Customer } from '@/features/customers';
import type { Product } from '@/features/products';
import type { SalesManager } from '@/features/sales-managers';

// ── Voltara brand tokens (mirrored from @/shared/tokens — react-pdf can't
// import the runtime token object directly because StyleSheet.create resolves
// at module load before brand colours are known). ──────────────────────────
const C = {
  green:    '#1B512D',
  yellow:   '#FECC3E',
  honeydew: '#E4F3E3',
  seasalt:  '#F9F9F9',
  white:    '#FFFFFF',
  slate:    '#767B77',
  border:   '#EBEBEB',
  divider:  '#F3F3F3',
  ink:      '#1A1A1A',
  inkMuted: '#444444',
};

// ── Register Figtree (per Voltara typography guideline) ─────────────────────
// react-pdf supports TTF/OTF/WOFF over HTTPS. @fontsource serves WOFF files
// via jsDelivr. Registered once per module import.
Font.register({
  family: 'Figtree',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.0.18/files/figtree-latin-400-normal.woff', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.0.18/files/figtree-latin-500-normal.woff', fontWeight: 500 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.0.18/files/figtree-latin-600-normal.woff', fontWeight: 600 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.0.18/files/figtree-latin-700-normal.woff', fontWeight: 700 },
    { src: 'https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.0.18/files/figtree-latin-800-normal.woff', fontWeight: 800 },
  ],
});
// Suppress hyphenation — Figtree shouldn't break words mid-line in a quote
Font.registerHyphenationCallback((word) => [word]);

interface Props {
  quote: Quote;
  customer: Customer | null;
  products: Product[];
  salesManager: SalesManager | null;
  profile: CompanyProfile;
  design: FormDesign;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtRM(n: number) {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 200,
    paddingHorizontal: 28,
    fontSize: 10,
    fontFamily: 'Figtree',
    fontWeight: 500,
    color: C.ink,
  },

  // ── Page header (fixed: repeats on every page) ─────────────────────────
  headerWrap: { marginBottom: 12 },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoBox: { width: 130 },
  logo: { height: 36, objectFit: 'contain', objectPosition: 'left center' },

  companyBlock: {
    flex: 1,
    paddingLeft: 24,
    textAlign: 'right',
    fontSize: 9,
    lineHeight: 1.45,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 700,
    color: C.green,
    marginBottom: 2,
  },
  companyLine: { color: C.inkMuted },

  titleBar: {
    marginTop: 16,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: C.green,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  docTitle: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 1,
    color: C.green,
    lineHeight: 1,
  },
  refBlock: {
    flex: 1,
    paddingLeft: 24,
    textAlign: 'right',
    fontSize: 9,
    lineHeight: 1.45,
    color: C.slate,
  },
  refId: { fontSize: 11, fontWeight: 700, color: C.ink },

  customerBlock: { marginTop: 12 },
  customerLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.slate,
    letterSpacing: 1,
    marginBottom: 3,
  },
  customerName: { fontSize: 12, fontWeight: 700, color: C.ink },
  customerLine: { fontSize: 9, color: C.slate, marginTop: 1 },

  headerNote: {
    marginTop: 10,
    padding: 10,
    backgroundColor: C.seasalt,
    borderRadius: 6,
    fontSize: 9,
    lineHeight: 1.5,
    color: C.inkMuted,
  },

  // ── Page footer (fixed: repeats at bottom of every page) ───────────────
  footerWrap: {
    position: 'absolute',
    bottom: 24,
    left: 28,
    right: 28,
    flexDirection: 'column',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerTermsLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.slate,
    letterSpacing: 1,
    marginBottom: 3,
  },
  footerTermsBody: {
    fontSize: 8,
    color: C.slate,
    lineHeight: 1.5,
  },
  footerSignRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 24,
  },
  footerSignBox: { flex: 1 },
  footerSignLine: { height: 28, borderBottomWidth: 1, borderBottomColor: C.slate },
  footerSignLabel: {
    marginTop: 3,
    fontSize: 8,
    color: C.slate,
    textAlign: 'center',
  },
  footerBottomBar: {
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: C.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { flex: 1, paddingRight: 12, fontSize: 8, color: C.slate },
  pageNumber: { fontSize: 8, fontWeight: 600, color: C.slate },

  // ── Line items table ───────────────────────────────────────────────────
  thead: {
    flexDirection: 'row',
    backgroundColor: C.green,
    color: C.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.6,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
    alignItems: 'flex-start',
  },
  colSku:         { width: 70, textAlign: 'center' },
  colDescription: { flex: 1, paddingRight: 8 },
  colQty:         { width: 40, textAlign: 'center' },
  colUnit:        { width: 78, textAlign: 'right' },
  colTax:         { width: 50, textAlign: 'right' },
  colTotal:       { width: 80, textAlign: 'right' },

  itemName:   { fontSize: 10, fontWeight: 600, color: C.ink },
  itemDetail: { fontSize: 8, color: C.slate, marginTop: 3, lineHeight: 1.5 },
  itemTotal:  { fontWeight: 700, color: C.ink },

  // ── Tail (totals, terms, signature, footer text) ──────────────────────
  preparedBy: { marginTop: 10, fontSize: 9, color: C.slate },
  preparedByName: { fontWeight: 700, color: C.ink },

  totalsWrap: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalsBox: { width: 240 },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    fontSize: 9,
  },
  totalsLabel: { color: C.slate },
  totalsValue: { fontWeight: 600, color: C.ink },
  totalLine: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: C.green,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 11, fontWeight: 700, color: C.green },
  totalValue: { fontSize: 14, fontWeight: 800, color: C.green },

  notesBlock: {
    marginTop: 16,
    padding: 10,
    backgroundColor: C.seasalt,
    borderRadius: 6,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.slate,
    letterSpacing: 1,
    marginBottom: 3,
  },
  notesBody: { fontSize: 9, color: C.ink, lineHeight: 1.5 },

  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: C.slate,
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionBody: { fontSize: 9, color: C.slate, lineHeight: 1.55 },

  signRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 24,
  },
  signBox: { flex: 1 },
  signLine: { height: 40, borderBottomWidth: 1, borderBottomColor: C.slate },
  signLabel: {
    marginTop: 4,
    fontSize: 8,
    color: C.slate,
    textAlign: 'center',
  },
});

export function QuotePdf({ quote, customer, products, salesManager, profile, design }: Props) {
  const accent = design.accent_color || profile.brand_color;

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
  const cv = design.column_visibility;

  const PageHeader = (
    <View fixed style={styles.headerWrap}>
      <View style={styles.headerTopRow}>
        <View style={styles.logoBox}>
          {design.show_logo && profile.logo_data_url ? (
            <Image src={profile.logo_data_url} style={styles.logo} />
          ) : null}
        </View>

        {design.show_company_address ? (
          <View style={styles.companyBlock}>
            <Text style={[styles.companyName, { color: accent }]}>{profile.company_name}</Text>
            {profile.address        ? <Text style={styles.companyLine}>{profile.address}</Text> : null}
            {profile.registration_no ? <Text style={styles.companyLine}>Reg: {profile.registration_no}</Text> : null}
            {profile.tax_id         ? <Text style={styles.companyLine}>SST: {profile.tax_id}</Text> : null}
            {profile.phone          ? <Text style={styles.companyLine}>{profile.phone}</Text> : null}
            {profile.email          ? <Text style={styles.companyLine}>{profile.email}</Text> : null}
            {profile.website        ? <Text style={styles.companyLine}>{profile.website}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={[styles.titleBar, { borderBottomColor: accent }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.docTitle, { color: accent }]}>{docTitle}</Text>
          <Text style={styles.refBlock}>
            <Text style={styles.refId}>{quote.id}</Text>{'\n'}
            Date: {fmtDate(quote.valid_from)}{'\n'}
            Valid Until: {fmtDate(quote.valid_to)}
          </Text>
        </View>
      </View>

      {design.show_customer_address && customer ? (
        <View style={styles.customerBlock}>
          <Text style={styles.customerLabel}>BILL TO</Text>
          <Text style={styles.customerName}>{customer.name}</Text>
          {customer.address      ? <Text style={styles.customerLine}>{customer.address}</Text> : null}
          {customer.attention_to ? <Text style={styles.customerLine}>Attn: {customer.attention_to}</Text> : null}
          {(customer.email || customer.phone) ? (
            <Text style={styles.customerLine}>
              {customer.email ?? ''}
              {customer.email && customer.phone ? '  ·  ' : ''}
              {customer.phone ?? ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      {design.header_note ? (
        <Text style={styles.headerNote}>{design.header_note}</Text>
      ) : null}
    </View>
  );

  const PageFooter = (
    <View fixed style={styles.footerWrap}>
      {design.terms_text ? (
        <View>
          <Text style={styles.footerTermsLabel}>TERMS & CONDITIONS</Text>
          <Text style={styles.footerTermsBody}>{design.terms_text}</Text>
        </View>
      ) : null}

      {design.show_signature_block ? (
        <View style={styles.footerSignRow}>
          <View style={styles.footerSignBox}>
            <View style={styles.footerSignLine} />
            <Text style={styles.footerSignLabel}>Authorised Signature</Text>
          </View>
          <View style={styles.footerSignBox}>
            <View style={styles.footerSignLine} />
            <Text style={styles.footerSignLabel}>Customer Acknowledgement</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.footerBottomBar}>
        <Text style={styles.footerText}>{design.footer_text ?? ''}</Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </View>
  );

  return (
    <Document
      title={`${docTitle} ${quote.id}`}
      author={profile.company_name}
      creator="Voltara Operations Dashboard"
    >
      <Page size={profile.paper_size === 'Letter' ? 'LETTER' : 'A4'} style={styles.page}>
        {PageHeader}

        {/* Column header — repeats on every page via fixed */}
        <View fixed style={[styles.thead, { backgroundColor: accent }]}>
          {cv.sku         ? <Text style={styles.colSku}>SKU</Text> : null}
          {cv.description ? <Text style={styles.colDescription}>DESCRIPTION</Text> : null}
          {cv.qty         ? <Text style={styles.colQty}>QTY</Text> : null}
          {cv.unit_price  ? <Text style={styles.colUnit}>UNIT PRICE</Text> : null}
          {cv.tax         ? <Text style={styles.colTax}>TAX</Text> : null}
          {cv.line_total  ? <Text style={styles.colTotal}>TOTAL</Text> : null}
        </View>

        {/* Line items — wrap-protected per row */}
        <View>
          {items.map((li, i) => (
            <View key={i} wrap={false} style={styles.tr}>
              {cv.sku ? <Text style={styles.colSku}>{li.sku}</Text> : null}
              {cv.description ? (
                <View style={styles.colDescription}>
                  <Text style={styles.itemName}>{li.name}</Text>
                  {li.detail ? <Text style={styles.itemDetail}>{li.detail}</Text> : null}
                </View>
              ) : null}
              {cv.qty        ? <Text style={styles.colQty}>{li.qty}</Text> : null}
              {cv.unit_price ? <Text style={styles.colUnit}>{fmtRM(li.unit_price)}</Text> : null}
              {cv.tax        ? <Text style={styles.colTax}>8%</Text> : null}
              {cv.line_total ? <Text style={[styles.colTotal, styles.itemTotal]}>{fmtRM(li.line_total)}</Text> : null}
            </View>
          ))}
        </View>

        {/* Tail — totals + notes + terms + signature */}
        <View>
          {salesManager ? (
            <Text style={styles.preparedBy}>
              Prepared by: <Text style={styles.preparedByName}>{salesManager.name}</Text>
              {salesManager.email ? ` · ${salesManager.email}` : ''}
              {salesManager.phone ? ` · ${salesManager.phone}` : ''}
            </Text>
          ) : null}

          <View style={styles.totalsWrap} wrap={false}>
            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{fmtRM(subtotal)}</Text>
              </View>
              {quote.discount > 0 ? (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Discount ({quote.discount}%)</Text>
                  <Text style={styles.totalsValue}>− {fmtRM(discountAmt)}</Text>
                </View>
              ) : null}
              {cv.tax ? (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Tax (8%)</Text>
                  <Text style={styles.totalsValue}>{fmtRM(taxAmt)}</Text>
                </View>
              ) : null}
              <View style={[styles.totalLine, { borderTopColor: accent }]}>
                <Text style={[styles.totalLabel, { color: accent }]}>TOTAL</Text>
                <Text style={[styles.totalValue, { color: accent }]}>{fmtRM(total)}</Text>
              </View>
            </View>
          </View>

          {design.show_notes && quote.notes ? (
            <View style={styles.notesBlock} wrap={false}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={styles.notesBody}>{quote.notes}</Text>
            </View>
          ) : null}
        </View>

        {PageFooter}
      </Page>
    </Document>
  );
}
