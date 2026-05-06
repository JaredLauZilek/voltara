import { C } from '@/shared/tokens';
import { useSeoCompetitors, useSeoIntegrations } from '../hooks';
import { ConnectAPIPrompt } from '../components/ConnectAPIPrompt';

export function CompetitorsTab() {
  const { data: competitors = [] } = useSeoCompetitors();
  const { data: integrations = [] } = useSeoIntegrations();

  const seoApi = integrations.find((i) =>
    (i.provider === 'dataforseo' || i.provider === 'ahrefs' || i.provider === 'semrush') && i.status === 'connected'
  );

  if (!seoApi) {
    return (
      <ConnectAPIPrompt
        provider="semrush"
        description="Track competitor rankings for your keywords and monitor their new backlinks. Requires a paid SEO API."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.divider}`, fontSize: 13, fontWeight: 700, color: C.green }}>
          Tracked competitors
        </div>
        {competitors.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No competitors added yet. Add domains via seo_competitors to start head-to-head ranking comparisons.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Domain', 'Label', 'Tracking since'].map((h) => (
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
              {competitors.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                  <td style={{ padding: '13px 16px', fontWeight: 600, color: '#1a1a1a' }}>{c.domain}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>{c.label ?? '—'}</td>
                  <td style={{ padding: '13px 16px', color: C.slate }}>
                    {new Date(c.added_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
          Head-to-head rankings
        </div>
        <div style={{ fontSize: 13, color: C.slate }}>
          Once competitors and keywords are populated, this view shows side-by-side positions for each tracked keyword
          and flags when a competitor outranks voltara.com.my for top-priority terms.
        </div>
      </div>
    </div>
  );
}
