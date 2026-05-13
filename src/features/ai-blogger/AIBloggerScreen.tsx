import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { useDrafts, useCompetitors, useKeywords } from './hooks';
import { DraftsTab } from './tabs/DraftsTab';
import { CompetitorsTab } from './tabs/CompetitorsTab';
import { KeywordsTab } from './tabs/KeywordsTab';
import { SEOTab } from './tabs/SEOTab';
import { SettingsTab } from './tabs/SettingsTab';

type Tab = 'drafts' | 'competitors' | 'keywords' | 'seo' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'drafts',      label: 'Drafts' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'keywords',    label: 'Keywords' },
  { id: 'seo',         label: 'SEO Performance' },
  { id: 'settings',    label: 'Settings' },
];

export function AIBloggerScreen() {
  const [tab, setTab] = useState<Tab>('drafts');
  const { data: drafts = [] } = useDrafts();
  const { data: competitors = [] } = useCompetitors();
  const { data: keywords = [] } = useKeywords();

  const drafting    = drafts.filter((d) => d.status === 'draft').length;
  const approved    = drafts.filter((d) => d.status === 'approved' || d.status === 'scheduled').length;
  const published   = drafts.filter((d) => d.status === 'published').length;
  const failed      = drafts.filter((d) => d.status === 'failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Drafts in queue"   value={drafting}  sub={`${competitors.length} competitors tracked`} accent />
        <KPICard label="Approved / Scheduled" value={approved}  sub="Ready to publish" />
        <KPICard label="Published"        value={published} sub={`${keywords.length} target keywords`} />
        <KPICard label="Failed"           value={failed}    sub={failed > 0 ? 'Needs attention' : 'All clear'} />
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 18px',
                marginBottom: -1,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${active ? C.green : 'transparent'}`,
                color: active ? C.green : C.slate,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'drafts'      && <DraftsTab />}
      {tab === 'competitors' && <CompetitorsTab />}
      {tab === 'keywords'    && <KeywordsTab />}
      {tab === 'seo'         && <SEOTab />}
      {tab === 'settings'    && <SettingsTab />}
    </div>
  );
}
