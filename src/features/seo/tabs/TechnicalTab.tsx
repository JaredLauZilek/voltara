import { useMemo } from 'react';
import { C } from '@/shared/tokens';
import { Donut } from '@/shared/components/charts/Donut';
import { useSeoPages, useSeoIntegrations } from '../hooks';
import { ConnectAPIPrompt } from '../components/ConnectAPIPrompt';

function cwvScore(ms: number, good: number, poor: number): 'good' | 'needs' | 'poor' {
  if (ms <= good) return 'good';
  if (ms <= poor) return 'needs';
  return 'poor';
}

const cwvColor: Record<'good' | 'needs' | 'poor', string> = {
  good: '#22a14b',
  needs: '#B07D00',
  poor: '#C0321A',
};

export function TechnicalTab() {
  const { data: pages = [] } = useSeoPages();
  const { data: integrations = [] } = useSeoIntegrations();

  const pagespeed = integrations.find((i) => i.provider === 'pagespeed');
  const gsc = integrations.find((i) => i.provider === 'gsc');

  const stats = useMemo(() => {
    const total = pages.length;
    const indexed = pages.filter((p) => p.indexed === true).length;
    const notIndexed = pages.filter((p) => p.indexed === false).length;
    const unknown = total - indexed - notIndexed;
    const errors = pages.filter((p) => (p.status_code ?? 0) >= 400).length;
    const mobileUnfriendly = pages.filter((p) => p.mobile_friendly === false).length;
    const lcpAvg = pages.filter((p) => p.lcp_ms != null).reduce((s, p) => s + (p.lcp_ms ?? 0), 0) /
      Math.max(1, pages.filter((p) => p.lcp_ms != null).length);
    const clsAvg = pages.filter((p) => p.cls != null).reduce((s, p) => s + Number(p.cls ?? 0), 0) /
      Math.max(1, pages.filter((p) => p.cls != null).length);
    const inpAvg = pages.filter((p) => p.inp_ms != null).reduce((s, p) => s + (p.inp_ms ?? 0), 0) /
      Math.max(1, pages.filter((p) => p.inp_ms != null).length);
    return { total, indexed, notIndexed, unknown, errors, mobileUnfriendly, lcpAvg, clsAvg, inpAvg };
  }, [pages]);

  if (pagespeed?.status !== 'connected' && gsc?.status !== 'connected' && pages.length === 0) {
    return (
      <ConnectAPIPrompt
        provider="pagespeed"
        description="PageSpeed Insights provides Core Web Vitals (LCP, CLS, INP), mobile usability, and HTTP status for every page in seo_pages. Free Google API."
        status={pagespeed?.status}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Indexing donut */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
            Indexing Status
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Donut
              segments={[
                { value: stats.indexed, color: C.green },
                { value: stats.notIndexed, color: '#C0321A' },
                { value: stats.unknown, color: C.divider },
              ]}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <LegendRow color={C.green} label="Indexed" value={stats.indexed} />
              <LegendRow color="#C0321A" label="Not indexed" value={stats.notIndexed} />
              <LegendRow color={C.divider} label="Unknown" value={stats.unknown} textColor={C.slate} />
            </div>
          </div>
        </div>

        {/* Crawl errors */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
            Health Snapshot
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Stat label="HTTP Errors (4xx/5xx)" value={stats.errors} bad={stats.errors > 0} />
            <Stat label="Mobile-unfriendly pages" value={stats.mobileUnfriendly} bad={stats.mobileUnfriendly > 0} />
            <Stat label="Total pages tracked" value={stats.total} />
          </div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
          Core Web Vitals (averages)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <CWVCard label="LCP" value={`${Math.round(stats.lcpAvg)}ms`} score={cwvScore(stats.lcpAvg, 2500, 4000)} />
          <CWVCard label="CLS" value={stats.clsAvg.toFixed(2)} score={cwvScore(stats.clsAvg * 1000, 100, 250)} />
          <CWVCard label="INP" value={`${Math.round(stats.inpAvg)}ms`} score={cwvScore(stats.inpAvg, 200, 500)} />
        </div>
      </div>

      {/* Pages table */}
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Page', 'Status', 'Indexed', 'LCP', 'CLS', 'INP', 'Mobile'].map((h) => (
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
            {pages.map((p) => (
              <tr key={p.url} style={{ borderBottom: `1px solid ${C.divider}` }}>
                <td style={{ padding: '13px 16px', color: '#1a1a1a' }}>{p.url}</td>
                <td style={{ padding: '13px 16px', color: (p.status_code ?? 0) >= 400 ? '#C0321A' : C.slate, fontWeight: 600 }}>
                  {p.status_code ?? '—'}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  {p.indexed === true ? '✓' : p.indexed === false ? '✗' : '—'}
                </td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{p.lcp_ms ? `${p.lcp_ms}ms` : '—'}</td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{p.cls != null ? Number(p.cls).toFixed(2) : '—'}</td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{p.inp_ms ? `${p.inp_ms}ms` : '—'}</td>
                <td style={{ padding: '13px 16px' }}>
                  {p.mobile_friendly === true ? '✓' : p.mobile_friendly === false ? '✗' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No pages tracked yet — add URLs to seo_pages and run the PageSpeed sync.
          </div>
        )}
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, textColor = '#1a1a1a' }: { color: string; label: string; value: number; textColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ color: C.slate, fontSize: 12 }}>{label}</span>
      <span style={{ color: textColor, fontWeight: 700, marginLeft: 'auto' }}>{value}</span>
    </div>
  );
}

function Stat({ label, value, bad = false }: { label: string; value: number; bad?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: C.slate }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: bad ? '#C0321A' : C.green }}>{value}</span>
    </div>
  );
}

function CWVCard({ label, value, score }: { label: string; value: string; score: 'good' | 'needs' | 'poor' }) {
  return (
    <div style={{ background: C.seasalt, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cwvColor[score], marginTop: 4, letterSpacing: '-0.03em' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: cwvColor[score], marginTop: 2, textTransform: 'capitalize' }}>
        {score === 'needs' ? 'needs improvement' : score}
      </div>
    </div>
  );
}
