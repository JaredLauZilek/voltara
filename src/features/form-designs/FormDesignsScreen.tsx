import { useEffect, useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Badge } from '@/shared/components/Badge';
import { useCompanyProfile, useFormDesigns, useUpdateCompanyProfile, useUpdateFormDesign } from './hooks';
import { BrandingPanel } from './BrandingPanel';
import { DocDesignPanel } from './DocDesignPanel';
import { FormPreview } from './FormPreview';
import { DEFAULT_COLUMN_VISIBILITY, DOC_TYPES } from './types';

// Receipts inherit the invoice form-design (heading swap is handled in the
// renderer), so they don't appear as their own tab here. They show up in the
// Email Designs UI because the email body really is different (thank-you vs
// "please pay").
const FORM_DESIGN_TABS = DOC_TYPES.filter((t) => t.id !== 'receipt');
import type { CompanyProfile, FormDesign, DocType } from './types';

const isDesignDefault = (d: FormDesign): boolean =>
  d.accent_color === null &&
  d.header_note === null &&
  d.footer_text === null &&
  d.terms_text === null &&
  d.payment_instructions === null &&
  d.show_logo &&
  d.show_company_address &&
  d.show_customer_address &&
  d.show_notes &&
  !d.show_signature_block &&
  JSON.stringify(d.column_visibility) === JSON.stringify(DEFAULT_COLUMN_VISIBILITY);

export function FormDesignsScreen() {
  const profileQ = useCompanyProfile();
  const designsQ = useFormDesigns();
  const updateProfile = useUpdateCompanyProfile();
  const updateDesign = useUpdateFormDesign();

  const [docType, setDocType] = useState<DocType>('invoice');
  const [profileDraft, setProfileDraft] = useState<CompanyProfile | null>(null);
  const [designDrafts, setDesignDrafts] = useState<Record<DocType, FormDesign | undefined>>({
    invoice: undefined, quote: undefined, delivery_order: undefined, purchase_order: undefined, receipt: undefined,
  });

  // Hydrate drafts from server data once it arrives
  useEffect(() => {
    if (profileQ.data && !profileDraft) setProfileDraft(profileQ.data);
  }, [profileQ.data, profileDraft]);
  useEffect(() => {
    if (designsQ.data) {
      setDesignDrafts((prev) => {
        const next = { ...prev };
        for (const d of designsQ.data!) if (!next[d.doc_type]) next[d.doc_type] = d;
        return next;
      });
    }
  }, [designsQ.data]);

  const currentDesignDraft = designDrafts[docType];
  const currentSavedDesign = designsQ.data?.find((d) => d.doc_type === docType);

  const profileDirty = useMemo(
    () => !!profileQ.data && !!profileDraft && JSON.stringify(profileQ.data) !== JSON.stringify(profileDraft),
    [profileQ.data, profileDraft]
  );
  const designDirty = useMemo(
    () => !!currentSavedDesign && !!currentDesignDraft && JSON.stringify(currentSavedDesign) !== JSON.stringify(currentDesignDraft),
    [currentSavedDesign, currentDesignDraft]
  );
  const dirty = profileDirty || designDirty;

  const handleTabChange = (next: DocType) => {
    if (designDirty) {
      const ok = window.confirm('Discard unsaved changes to this document design?');
      if (!ok) return;
      setDesignDrafts((prev) => ({ ...prev, [docType]: currentSavedDesign }));
    }
    setDocType(next);
  };

  const handleSave = () => {
    if (profileDirty && profileDraft) {
      const { id, updated_at, ...patch } = profileDraft;
      void id; void updated_at;
      updateProfile.mutate(patch);
    }
    if (designDirty && currentDesignDraft) {
      const { doc_type, updated_at, ...patch } = currentDesignDraft;
      void doc_type; void updated_at;
      updateDesign.mutate({ docType, patch });
    }
  };

  const handleResetDoc = () => {
    if (!currentDesignDraft) return;
    setDesignDrafts((prev) => ({
      ...prev,
      [docType]: {
        ...currentDesignDraft,
        accent_color: null,
        header_note: null,
        footer_text: null,
        terms_text: null,
        payment_instructions: null,
        show_logo: true,
        show_company_address: true,
        show_customer_address: true,
        show_notes: true,
        show_signature_block: false,
        column_visibility: { ...DEFAULT_COLUMN_VISIBILITY },
      },
    }));
  };

  if (!profileDraft || !currentDesignDraft) {
    return <div style={{ padding: 32, color: C.slate, fontSize: 14 }}>Loading designs…</div>;
  }

  const isPending = updateProfile.isPending || updateDesign.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Doc-type pill tabs */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 6 }}>
          Document Type
        </span>
        {FORM_DESIGN_TABS.map((t) => {
          const saved = designsQ.data?.find((d) => d.doc_type === t.id);
          const modified = saved && !isDesignDefault(saved);
          const active = docType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 99,
                border: `2px solid ${active ? C.green : C.border}`,
                background: active ? C.honeydew : C.white,
                color: active ? C.green : C.slate,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.label}
              {modified && (
                <span style={{ background: '#FFF8E1', color: '#B07D00', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
                  Modified
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Two-column layout — settings left, preview right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <BrandingPanel
            draft={profileDraft}
            onChange={(patch) => setProfileDraft((prev) => prev ? { ...prev, ...patch } : prev)}
          />
          <DocDesignPanel
            docType={docType}
            draft={currentDesignDraft}
            onChange={(patch) => setDesignDrafts((prev) => ({ ...prev, [docType]: { ...currentDesignDraft, ...patch } }))}
          />

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '14px 0' }}>
            <button
              onClick={handleResetDoc}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                color: C.slate,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset {DOC_TYPES.find((d) => d.id === docType)?.label} to defaults
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              {dirty && <Badge status="Pending" />}
              <button
                onClick={handleSave}
                disabled={!dirty || isPending}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: !dirty || isPending ? C.slate : C.green,
                  color: C.white,
                  fontFamily: 'Figtree',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !dirty || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Sticky preview */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Live Preview
          </div>
          <FormPreview profile={profileDraft} design={currentDesignDraft} docType={docType} />
        </div>
      </div>
    </div>
  );
}
