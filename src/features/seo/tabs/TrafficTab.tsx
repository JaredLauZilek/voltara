import { useMemo } from 'react';
import { C } from '@/shared/tokens';
import { LineChart } from '@/shared/components/charts/LineChart';
import { useSeoTraffic, useSeoIntegrations } from '../hooks';
import { ConnectAPIPrompt } from '../components/ConnectAPIPrompt';

export function TrafficTab() {
  const { data: traffic = [] } = useSeoTraffic(28);
  const { data: integrations = [] } = useSeoIntegrations();

  const gsc = integrations.find((i) => i.provider === 'gsc');

  // Aggregate daily totals across the 28-day window.
  const { daily, byPage } = useMemo(() => {
    const dailyMap = new Map<string, { clicks: number; impressions: number }>();
    const pageMap = new Map<string, { clicks: number; impressions: number; ctr: number }>();
    for (const r of traffic) {
      const day = dailyMap.get(r.captured_date) ?? { clicks: 0, impressions: 0 };
      day.clicks += r.clicks;
      day.impressions += r.impressions;
      dailyMap.set(r.captured_date, day);

      const p = pageMap.get(r.page) ?? { clicks: 0, impressions: 0, ctr: 0 };
      p.clicks += r.clicks;
      p.impressions += r.impressions;
      pageMap.set(r.page, p);
    }
    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({ date, ...d }));
    const byPage = [...pageMap.entries()]
      .map(([page, p]) => ({ page, ...p, ctr: p.impressions ? p.clicks / p.impressions : 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
    return { daily, byPage };
  }, [traffic]);

  if (gsc?.status !== 'connected' && traffic.length === 0) {
    return (
      <ConnectAPIPrompt
        provider="gsc"
        description="Organic clicks, impressions, CTR, and average position — straight from Google Search Console."
        status={gsc?.status}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
          Organic Clicks · Last 28 days
        </div>
        {daily.length > 0 ? (
          <LineChart
            data={daily.map((d) => d.clicks)}
            labels={daily.map((d) => d.date.slice(5))}
            height={180}
          />
        ) : (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 13 }}>
            No traffic captured yet.
          </div>
        )}
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.divider}`, fontSize: 13, fontWeight: 700, color: C.green }}>
          Top pages by organic clicks
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Page', 'Clicks', 'Impressions', 'CTR'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.slate,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byPage.map((p) => (
              <tr key={p.page} style={{ borderBottom: `1px solid ${C.divider}` }}>
                <td style={{ padding: '13px 16px', fontWeight: 500, color: '#1a1a1a' }}>{p.page}</td>
                <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>{p.clicks.toLocaleString()}</td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{p.impressions.toLocaleString()}</td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{(p.ctr * 100).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {byPage.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>No page-level data yet.</div>
        )}
      </div>
    </div>
  );
}
