import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Customer } from '@/features/customers';
import type { Product } from '@/features/products';
import type { Quote } from '@/features/sales';
import type { Installation } from '../types';

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
  installation: Installation;
  quote: Quote | null;
  customer: Customer | null;
  products: Product[];
  profile: CompanyProfile;
  design: FormDesign;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
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

  twoCol: { marginTop: 12, flexDirection: 'row', gap: 24 },
  colHalf: { flex: 1 },
  blockLabel: { fontSize: 8, fontWeight: 700, color: C.slate, letterSpacing: 1, marginBottom: 3 },
  customerName: { fontSize: 12, fontWeight: 700, color: C.ink },
  customerLine: { fontSize: 9, color: C.slate, marginTop: 1 },
  refRow: { fontSize: 9, color: C.ink, marginTop: 2, lineHeight: 1.6 },
  refRowLabel: { fontWeight: 700, color: C.slate },

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
  colSku:         { width: 90, textAlign: 'center' },
  colDescription: { flex: 1, paddingRight: 8 },
  colQty:         { width: 60, textAlign: 'center' },

  itemName:   { fontSize: 10, fontWeight: 600, color: C.ink },
  itemDetail: { fontSize: 8, color: C.slate, marginTop: 3, lineHeight: 1.5 },

  emptyRow: {
    paddingVertical: 18, textAlign: 'center', color: C.slate, fontSize: 9,
    borderBottomWidth: 1, borderBottomColor: C.divider,
  },

  notesBlock: {
    marginTop: 16, padding: 10, backgroundColor: C.seasalt, borderRadius: 6,
  },
  notesLabel: { fontSize: 8, fontWeight: 700, color: C.slate, letterSpacing: 1, marginBottom: 3 },
  notesBody: { fontSize: 9, color: C.ink, lineHeight: 1.5 },
});

export function DeliveryOrderPdf({ installation, quote, customer, products, profile, design }: Props) {
  const accent = design.accent_color || profile.brand_color;
  const productById = new Map(products.map((p) => [p.id, p]));
  const overrides = installation.qty_overrides ?? {};
  const items = (quote?.line_items ?? []).map((li, i) => {
    const p = productById.get(li.product_id);
    const override = overrides[String(i)];
    return {
      sku: li.product_id ? (p?.id ?? li.product_id) : '—',
      name: li.product_id ? (p?.name ?? '—') : (li.description?.trim() || 'Custom item'),
      detail: li.product_id ? (li.description ?? p?.description ?? null) : null,
      qty: override ?? li.qty,
    };
  });

  const cv = design.column_visibility;
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
          <Text style={[styles.docTitle, { color: accent }]}>DELIVERY ORDER</Text>
          <Text style={styles.refBlock}>
            <Text style={styles.refId}>{installation.id}</Text>{'\n'}
            Date: {fmtDate(installation.scheduled)}
          </Text>
        </View>
      </View>

      {/* Deliver To + Reference, side by side */}
      <View style={styles.twoCol}>
        {design.show_customer_address ? (
          <View style={styles.colHalf}>
            <Text style={styles.blockLabel}>DELIVER TO</Text>
            <Text style={styles.customerName}>{customer?.name ?? installation.customer_id}</Text>
            {customer?.address ? <Text style={styles.customerLine}>{customer.address}</Text> : null}
            {(customer?.email || customer?.phone) ? (
              <Text style={styles.customerLine}>
                {customer?.email ?? ''}
                {customer?.email && customer?.phone ? '  ·  ' : ''}
                {customer?.phone ?? ''}
              </Text>
            ) : null}
          </View>
        ) : <View style={styles.colHalf} />}

        <View style={styles.colHalf}>
          <Text style={styles.blockLabel}>REFERENCE</Text>
          {quote ? (
            <Text style={styles.refRow}>
              <Text style={styles.refRowLabel}>Quote / Proposal: </Text>
              {quote.id} ({quote.type})
            </Text>
          ) : null}
          <Text style={styles.refRow}>
            <Text style={styles.refRowLabel}>Status: </Text>
            {installation.status}
          </Text>
        </View>
      </View>

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
            <Text style={styles.footerSignLabel}>
              Delivered by{installation.tech ? ` (${installation.tech})` : ''}
            </Text>
          </View>
          <View style={styles.footerSignBox}>
            <View style={styles.footerSignLine} />
            <Text style={styles.footerSignLabel}>Received by (Customer)</Text>
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
      title={`DELIVERY ORDER ${installation.id}`}
      author={profile.company_name}
      creator="Voltara Operations Dashboard"
    >
      <Page
        size={profile.paper_size === 'Letter' ? 'LETTER' : 'A4'}
        style={[styles.page, { paddingBottom: pageBottomPadding }]}
      >
        {PageHeader}

        {/* DOs intentionally hide price columns even if the design enables them. */}
        <View fixed style={[styles.thead, { backgroundColor: accent }]}>
          {cv.sku         ? <Text style={styles.colSku}>SKU</Text> : null}
          {cv.description ? <Text style={styles.colDescription}>DESCRIPTION</Text> : null}
          {cv.qty         ? <Text style={styles.colQty}>QTY</Text> : null}
        </View>

        <View>
          {items.length === 0 ? (
            <Text style={styles.emptyRow}>No line items recorded for this delivery.</Text>
          ) : (
            items.map((li, i) => (
              <View key={i} wrap={false} style={styles.tr}>
                {cv.sku ? <Text style={styles.colSku}>{li.sku}</Text> : null}
                {cv.description ? (
                  <View style={styles.colDescription}>
                    <Text style={styles.itemName}>{li.name}</Text>
                    {li.detail ? <Text style={styles.itemDetail}>{li.detail}</Text> : null}
                  </View>
                ) : null}
                {cv.qty ? <Text style={styles.colQty}>{li.qty}</Text> : null}
              </View>
            ))
          )}
        </View>

        {design.show_notes && installation.notes ? (
          <View style={styles.notesBlock} wrap={false}>
            <Text style={styles.notesLabel}>NOTES</Text>
            <Text style={styles.notesBody}>{installation.notes}</Text>
          </View>
        ) : null}

        {PageFooter}
      </Page>
    </Document>
  );
}
