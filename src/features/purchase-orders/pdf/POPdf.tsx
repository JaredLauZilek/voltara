import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { PurchaseOrder } from '../types';
import type { Supplier } from '@/features/suppliers';
import type { Product } from '@/features/products';
import { calcPOTotal } from '../types';

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
Font.registerHyphenationCallback((word) => [word]);

interface Props {
  po: PurchaseOrder;
  supplier: Supplier | null;
  products: Product[];
  profile: CompanyProfile;
  design: FormDesign;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(currency: string, n: number) {
  return `${currency} ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 28,
    fontSize: 10,
    fontFamily: 'Figtree',
    fontWeight: 500,
    color: C.ink,
  },

  headerWrap: { marginBottom: 12 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoBox: { width: 130 },
  logo: { height: 36, objectFit: 'contain', objectPosition: 'left center' },

  companyBlock: { flex: 1, paddingLeft: 24, textAlign: 'right', fontSize: 9, lineHeight: 1.45 },
  companyName: { fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 2 },
  companyLine: { color: C.inkMuted },

  titleBar: { marginTop: 16, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: C.green },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  docTitle: { fontSize: 22, fontWeight: 800, letterSpacing: 1, color: C.green, lineHeight: 1 },
  refBlock: { flex: 1, paddingLeft: 24, textAlign: 'right', fontSize: 9, lineHeight: 1.45, color: C.slate },
  refId: { fontSize: 11, fontWeight: 700, color: C.ink },

  supplierBlock: { marginTop: 12 },
  supplierLabel: { fontSize: 8, fontWeight: 700, color: C.slate, letterSpacing: 1, marginBottom: 3 },
  supplierName: { fontSize: 12, fontWeight: 700, color: C.ink },
  supplierLine: { fontSize: 9, color: C.slate, marginTop: 1 },

  headerNote: {
    marginTop: 10, padding: 10, backgroundColor: C.seasalt, borderRadius: 6,
    fontSize: 9, lineHeight: 1.5, color: C.inkMuted,
  },

  footerWrap: {
    position: 'absolute', bottom: 24, left: 28, right: 28,
    flexDirection: 'column', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border,
  },
  footerTermsLabel: { fontSize: 8, fontWeight: 700, color: C.slate, letterSpacing: 1, marginBottom: 3 },
  footerTermsBody: { fontSize: 8, color: C.slate, lineHeight: 1.5 },
  footerSignRow: { marginTop: 14, flexDirection: 'row', gap: 24 },
  footerSignBox: { flex: 1 },
  footerSignLine: { height: 28, borderBottomWidth: 1, borderBottomColor: C.slate },
  footerSignLabel: { marginTop: 3, fontSize: 8, color: C.slate, textAlign: 'center' },
  footerBottomBar: {
    marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.divider,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { flex: 1, paddingRight: 12, fontSize: 8, color: C.slate },
  pageNumber: { fontSize: 8, fontWeight: 600, color: C.slate },

  thead: {
    flexDirection: 'row', backgroundColor: C.green, color: C.white,
    paddingVertical: 8, paddingHorizontal: 10,
    fontSize: 8, fontWeight: 700, letterSpacing: 0.6,
  },
  tr: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: C.divider, alignItems: 'flex-start',
  },
  colSku:         { width: 70, textAlign: 'center' },
  colDescription: { flex: 1, paddingRight: 8 },
  colQty:         { width: 40, textAlign: 'center' },
  colUnit:        { width: 88, textAlign: 'right' },
  colTotal:       { width: 92, textAlign: 'right' },

  itemName:   { fontSize: 10, fontWeight: 600, color: C.ink },
  itemDetail: { fontSize: 8, color: C.slate, marginTop: 3, lineHeight: 1.5 },
  itemTotal:  { fontWeight: 700, color: C.ink },

  totalsWrap: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end' },
  totalsBox: { width: 260 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, fontSize: 9 },
  totalsLabel: { color: C.slate },
  totalsValue: { fontWeight: 600, color: C.ink },
  totalLine: {
    marginTop: 6, paddingTop: 8, borderTopWidth: 2, borderTopColor: C.green,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  totalLabel: { fontSize: 11, fontWeight: 700, color: C.green },
  totalValue: { fontSize: 14, fontWeight: 800, color: C.green },

  notesBlock: {
    marginTop: 16, padding: 10, backgroundColor: C.seasalt, borderRadius: 6,
  },
  notesLabel: { fontSize: 8, fontWeight: 700, color: C.slate, letterSpacing: 1, marginBottom: 3 },
  notesBody: { fontSize: 9, color: C.ink, lineHeight: 1.5 },
});

export function POPdf({ po, supplier, products, profile, design }: Props) {
  const accent = design.accent_color || profile.brand_color;
  const currency = po.currency ?? 'RM';

  const items = po.line_items.map((li) => {
    const p = products.find((x) => x.id === li.product_id);
    return {
      sku: li.product_id ? (p?.id ?? li.product_id) : '—',
      name: li.product_id ? (p?.name ?? '—') : (li.description?.trim() || 'Custom item'),
      // Catalogue rows: per-line override wins, else master description.
      // Custom rows: the description IS the label, so don't repeat it as detail.
      detail: li.product_id ? (li.description ?? p?.description ?? null) : null,
      qty: li.qty,
      unit_price: li.unit_price_snapshot,
      line_total: li.qty * li.unit_price_snapshot,
    };
  });

  const subtotal = po.line_items.reduce((s, li) => s + li.qty * li.unit_price_snapshot, 0);
  const total = calcPOTotal(po.line_items, po.discount);
  const cv = design.column_visibility;

  // Match InvoicePdf: dynamically reserve only as much bottom space as the
  // active footer sections actually need.
  const hasTerms = !!design.terms_text;
  const hasSig = !!design.show_signature_block;
  const pageBottomPadding = 50 + (hasTerms ? 50 : 0) + (hasSig ? 65 : 0);

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
          <Text style={[styles.docTitle, { color: accent }]}>PURCHASE ORDER</Text>
          <Text style={styles.refBlock}>
            <Text style={styles.refId}>{po.id}</Text>{'\n'}
            Created: {fmtDate(po.created_date)}{'\n'}
            Currency: {currency}
          </Text>
        </View>
      </View>

      {/* The form-design "show_customer_address" flag is repurposed for the
          supplier block on POs — the design fields are shared across doc types. */}
      {design.show_customer_address && supplier ? (
        <View style={styles.supplierBlock}>
          <Text style={styles.supplierLabel}>SUPPLIER</Text>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          {supplier.address ? <Text style={styles.supplierLine}>{supplier.address}</Text> : null}
          {supplier.contact ? <Text style={styles.supplierLine}>Attn: {supplier.contact}</Text> : null}
          {(supplier.email || supplier.phone) ? (
            <Text style={styles.supplierLine}>
              {supplier.email ?? ''}
              {supplier.email && supplier.phone ? '  ·  ' : ''}
              {supplier.phone ?? ''}
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
            <Text style={styles.footerSignLabel}>Authorised by (Buyer)</Text>
          </View>
          <View style={styles.footerSignBox}>
            <View style={styles.footerSignLine} />
            <Text style={styles.footerSignLabel}>Acknowledged by (Supplier)</Text>
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
      title={`PURCHASE ORDER ${po.id}`}
      author={profile.company_name}
      creator="Voltara Operations Dashboard"
    >
      <Page
        size={profile.paper_size === 'Letter' ? 'LETTER' : 'A4'}
        style={[styles.page, { paddingBottom: pageBottomPadding }]}
      >
        {PageHeader}

        <View fixed style={[styles.thead, { backgroundColor: accent }]}>
          {cv.sku         ? <Text style={styles.colSku}>SKU</Text> : null}
          {cv.description ? <Text style={styles.colDescription}>DESCRIPTION</Text> : null}
          {cv.qty         ? <Text style={styles.colQty}>QTY</Text> : null}
          {cv.unit_price  ? <Text style={styles.colUnit}>UNIT PRICE</Text> : null}
          {cv.line_total  ? <Text style={styles.colTotal}>TOTAL</Text> : null}
        </View>

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
              {cv.unit_price ? <Text style={styles.colUnit}>{fmtMoney(currency, li.unit_price)}</Text> : null}
              {cv.line_total ? <Text style={[styles.colTotal, styles.itemTotal]}>{fmtMoney(currency, li.line_total)}</Text> : null}
            </View>
          ))}
        </View>

        <View>
          <View style={styles.totalsWrap} wrap={false}>
            <View style={styles.totalsBox}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{fmtMoney(currency, subtotal)}</Text>
              </View>
              {po.discount > 0 ? (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Discount ({po.discount}%)</Text>
                  <Text style={styles.totalsValue}>− {fmtMoney(currency, subtotal - total)}</Text>
                </View>
              ) : null}
              <View style={[styles.totalLine, { borderTopColor: accent }]}>
                <Text style={[styles.totalLabel, { color: accent }]}>TOTAL</Text>
                <Text style={[styles.totalValue, { color: accent }]}>{fmtMoney(currency, total)}</Text>
              </View>
            </View>
          </View>

          {design.show_notes && po.notes ? (
            <View style={styles.notesBlock} wrap={false}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={styles.notesBody}>{po.notes}</Text>
            </View>
          ) : null}
        </View>

        {PageFooter}
      </Page>
    </Document>
  );
}
