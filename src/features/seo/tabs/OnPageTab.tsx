import { useMemo } from 'react';
import { C } from '@/shared/tokens';
import { useSeoPages } from '../hooks';

export function OnPageTab() {
  const { data: pages = [] } = useSeoPages();

  const issues = useMemo(() => {
    const titleCount = new Map<string, number>();
    const metaCount = new Map<string, number>();
    for (const p of pages) {
      if (p.title) titleCount.set(p.title, (titleCount.get(p.title) ?? 0) + 1);
      if (p.meta_description) metaCount.set(p.meta_description, (metaCount.get(p.meta_description) ?? 0) + 1);
    }
    return {
      missingTitle: pages.filter((p) => !p.title),
      duplicateTitle: pages.filter((p) => p.title && (titleCount.get(p.title) ?? 0) > 1),
      missingMeta: pages.filter((p) => !p.meta_description),
      duplicateMeta: pages.filter((p) => p.meta_description && (metaCount.get(p.meta_description) ?? 0) > 1),
      thinContent: pages.filter((p) => (p.title?.length ?? 0) < 20),
      brokenInternalLinks: 0, // populated by crawler in Wave 2
      missingAlt: 0,          // populated by crawler in Wave 2
    };
  }, [pages]);

  if (pages.length === 0) {
    return (
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>No on-page data yet</div>
        <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
          On-page audits run after the PageSpeed sync populates seo_pages with title and meta_description.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <IssueCard label="Missing meta titles" value={issues.missingTitle.length} />
        <IssueCard label="Duplicate titles" value={issues.duplicateTitle.length} />
        <IssueCard label="Missing meta description" value={issues.missingMeta.length} />
        <IssueCard label="Duplicate meta description" value={issues.duplicateMeta.length} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <IssueCard label="Thin content (title < 20 chars)" value={issues.thinContent.length} />
        <IssueCard label="Broken internal links" value={issues.brokenInternalLinks} muted />
        <IssueCard label="Missing alt text" value={issues.missingAlt} muted />
      </div>

      <IssueList title="Pages missing a title" pages={issues.missingTitle.map((p) => p.url)} />
      <IssueList title="Pages with duplicate titles" pages={issues.duplicateTitle.map((p) => `${p.url} — "${p.title}"`)} />
      <IssueList title="Pages missing a meta description" pages={issues.missingMeta.map((p) => p.url)} />
    </div>
  );
}

function IssueCard({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  const color = muted ? C.slate : value > 0 ? '#C0321A' : C.green;
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.03em', marginTop: 6 }}>{value}</div>
      {muted && <div style={{ fontSize: 11, color: C.slate, marginTop: 2, fontStyle: 'italic' }}>Crawler in Wave 2</div>}
    </div>
  );
}

function IssueList({ title, pages }: { title: string; pages: string[] }) {
  if (pages.length === 0) return null;
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.divider}`, fontSize: 13, fontWeight: 700, color: C.green }}>
        {title} ({pages.length})
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {pages.slice(0, 8).map((u) => (
          <li
            key={u}
            style={{
              padding: '10px 20px',
              borderBottom: `1px solid ${C.divider}`,
              fontSize: 13,
              color: '#1a1a1a',
            }}
          >
            {u}
          </li>
        ))}
      </ul>
    </div>
  );
}
