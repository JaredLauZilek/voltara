import { useMemo } from 'react';
import { C } from '@/shared/tokens';
import { useCompanyProfile } from '@/features/form-designs';
import { renderEmailHtml } from './render';
import type { CompanyEmailProfile, EmailDesign, PlaceholderContext, DocType } from './types';

interface Props {
  docType: DocType;
  design: EmailDesign;
  profile: CompanyEmailProfile;
}

function buildSampleContext(docType: DocType, companyName: string): PlaceholderContext {
  const baseDoc = (() => {
    switch (docType) {
      case 'invoice':        return { id: 'INV-2026-3098',  kind: 'Invoice',        date: '11 May 2026', due_date: '10 Jun 2026', valid_to: '—',           total: 'RM 12,400.00' };
      case 'quote':          return { id: 'Q-2026-001',     kind: 'Quotation',      date: '11 May 2026', due_date: '—',            valid_to: '10 Jun 2026', total: 'RM 12,400.00' };
      case 'delivery_order': return { id: 'DO-2026-0421',   kind: 'Delivery Order', date: '14 May 2026', due_date: '—',            valid_to: '—',           total: 'RM 12,400.00' };
      case 'purchase_order': return { id: 'PO-2026-0188',   kind: 'Purchase Order', date: '11 May 2026', due_date: '—',            valid_to: '—',           total: 'RM 8,750.00'  };
      case 'receipt':        return { id: 'INV-2026-3098',  kind: 'Receipt',        date: '14 May 2026', due_date: '—',            valid_to: '—',           total: 'RM 12,400.00' };
    }
  })();
  return {
    customer: {
      name:         'Lee Cheng Wei',
      email:        'lee.cw@email.com',
      phone:        '+60 16 234 5678',
      address:      'Lot 12, Jalan Industri 3/8, 47100 Puchong, Selangor',
      attention_to: 'Mr Lee',
    },
    doc: { ...baseDoc, currency: 'RM' },
    company: {
      name:    companyName,
      address: 'Voltara HQ, Petaling Jaya, Selangor',
      phone:   '+60 12 345 6789',
      email:   'hello@voltara.com.my',
      website: 'voltara.com.my',
    },
  };
}

export function EmailPreview({ docType, design, profile }: Props) {
  const companyProfile = useCompanyProfile();
  const companyName = companyProfile.data?.company_name ?? 'Voltara Sdn Bhd';
  const brandColor = companyProfile.data?.brand_color;
  const logoDataUrl = design.show_logo ? companyProfile.data?.logo_data_url ?? null : null;

  const rendered = useMemo(() => {
    const ctx = buildSampleContext(docType, companyName);
    return renderEmailHtml({ design, profile, ctx, brandColor, logoDataUrl });
  }, [docType, design, profile, companyName, brandColor, logoDataUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>From</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{rendered.from}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>To</span>
          <span style={{ fontSize: 13, color: '#1a1a1a' }}>Lee Cheng Wei &lt;lee.cw@email.com&gt;</span>
        </div>
        {rendered.replyTo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Reply-To</span>
            <span style={{ fontSize: 13, color: '#1a1a1a' }}>{rendered.replyTo}</span>
          </div>
        )}
        {rendered.cc && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>CC</span>
            <span style={{ fontSize: 13, color: '#1a1a1a' }}>{rendered.cc}</span>
          </div>
        )}
        {rendered.bcc && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>BCC</span>
            <span style={{ fontSize: 13, color: '#1a1a1a' }}>{rendered.bcc}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 4, borderTop: `1px solid ${C.divider}`, paddingTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', width: 60 }}>Subject</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{rendered.subject}</span>
        </div>
      </div>

      <iframe
        title="Email preview"
        srcDoc={rendered.html}
        sandbox=""
        style={{
          width: '100%',
          height: 560,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          background: C.seasalt,
        }}
      />

      {design.attach_pdf && (
        <div style={{ fontSize: 11, color: C.slate, padding: '0 4px' }}>
          The {docType.replace('_', ' ')} PDF will be attached automatically when this email is sent.
        </div>
      )}
    </div>
  );
}
