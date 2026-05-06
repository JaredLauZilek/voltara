import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { useSeoSummary, useSeoIntegrations } from './hooks';
import { SEO_TABS, PROVIDER_LABELS } from './types';
import type { SeoTabId } from './types';
import { RankingsTab } from './tabs/RankingsTab';
import { TrafficTab } from './tabs/TrafficTab';
import { TechnicalTab } from './tabs/TechnicalTab';
import { BacklinksTab } from './tabs/BacklinksTab';
import { OnPageTab } from './tabs/OnPageTab';
import { CompetitorsTab } from './tabs/CompetitorsTab';
import { AlertsTab } from './tabs/AlertsTab';

const TAB_RENDER: Record<SeoTabId, () => JSX.Element> = {
  rankings:    () => <RankingsTab />,
  traffic:     () => <TrafficTab />,
  technical:   () => <TechnicalTab />,
  backlinks:   () => <BacklinksTab />,
  onpage:      () => <OnPageTab />,
  competitors: () => <CompetitorsTab />,
  alerts:      () => <AlertsTab />,
};

export function SEOMonitorScreen() {
  const [tab, setTab] = useState<SeoTabId>('rankings');
  const { data: summary } = useSeoSummary();
  const { data: integrations = [] } = useSeoIntegrations();

  const indexed = summary?.indexed_pages ?? 0;
  const avgPos = summary?.avg_position_28d ?? 0;
  const clicks = summary?.clicks_28d ?? 0;
  const openAlerts = summary?.open_alerts ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Indexed Pages" value={indexed} sub="of all tracked pages" />
        <KPICard label="Avg. Position (28d)" value={avgPos > 0 ? Number(avgPos).toFixed(1) : '—'} sub="Lower is better" />
        <KPICard label="Organic Clicks (28d)" value={Number(clicks).toLocaleString()} sub="From Search Console" />
        <KPICard
          label="Open Alerts"
          value={openAlerts}
          sub={openAlerts > 0 ? 'Action needed' : 'All clear'}
          accent
        />
      </div>

      {/* Integrations status strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Integrations:
        </span>
        {integrations.map((i) => (
          <IntegrationDot key={i.provider} label={PROVIDER_LABELS[i.provider]} status={i.status} />
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SEO_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 99,
                border: `2px solid ${active ? C.green : C.border}`,
                background: active ? C.green : C.white,
                color: active ? C.white : C.slate,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      {TAB_RENDER[tab]()}
    </div>
  );
}

function IntegrationDot({ label, status }: { label: string; status: 'not_connected' | 'connected' | 'error' }) {
  const color = status === 'connected' ? '#22a14b' : status === 'error' ? '#C0321A' : C.slate;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 99,
        background: C.white,
        border: `1px solid ${C.border}`,
        fontSize: 11,
        fontWeight: 600,
        color: C.slate,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      {label}
    </span>
  );
}
