import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Toolbar } from '@/shared/components/Toolbar';
import { useSeoKeywords, useSeoTopMovers, useSeoIntegrations } from '../hooks';
import { KeywordRow } from '../components/KeywordRow';
import { ConnectAPIPrompt } from '../components/ConnectAPIPrompt';

export function RankingsTab() {
  const { data: keywords = [] } = useSeoKeywords();
  const { data: movers = [] } = useSeoTopMovers();
  const { data: integrations = [] } = useSeoIntegrations();
  const [device, setDevice] = useState<'All' | 'desktop' | 'mobile'>('All');
  const [search, setSearch] = useState('');

  const gsc = integrations.find((i) => i.provider === 'gsc');
  const seoApi = integrations.find((i) =>
    i.provider === 'dataforseo' || i.provider === 'ahrefs' || i.provider === 'semrush'
  );

  const filtered = useMemo(() => {
    return keywords.filter((k) => {
      if (device !== 'All' && k.device !== device) return false;
      if (search && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [keywords, device, search]);

  const moverByKeywordId = useMemo(() => {
    const m = new Map<string, { latest: number | null; delta: number | null }>();
    for (const r of movers) m.set(r.keyword_id, { latest: r.latest_pos, delta: r.delta });
    return m;
  }, [movers]);

  if (gsc?.status !== 'connected' && keywords.length === 0) {
    return (
      <ConnectAPIPrompt
        provider="gsc"
        description="Pull keyword positions, impressions, and clicks for voltara.com.my from Google Search Console. Daily sync runs at 04:00 KL once connected."
        status={gsc?.status}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Toolbar
        filters={['All', 'desktop', 'mobile']}
        filter={device}
        onFilterChange={(f) => setDevice(f as typeof device)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search keywords…"
      />

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Keyword', 'Country', 'Device', 'Position', 'Δ 7d', 'Trend'].map((h) => (
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
            {filtered.map((k) => {
              const m = moverByKeywordId.get(k.id);
              return (
                <KeywordRow
                  key={k.id}
                  keyword={k}
                  position={m?.latest ?? null}
                  delta={m?.delta ?? null}
                  history={[]}
                />
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No keyword data yet — sync runs daily at 04:00.
          </div>
        )}
      </div>

      {!seoApi || seoApi.status !== 'connected' ? (
        <div style={{ marginTop: 8 }}>
          <ConnectAPIPrompt
            provider="dataforseo"
            description="Track SERP features (featured snippets, local packs) and rankings by location with a paid SEO API."
          />
        </div>
      ) : null}
    </div>
  );
}
