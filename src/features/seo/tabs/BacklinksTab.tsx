import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { Toolbar } from '@/shared/components/Toolbar';
import { useSeoBacklinks, useSeoIntegrations } from '../hooks';
import { ConnectAPIPrompt } from '../components/ConnectAPIPrompt';

export function BacklinksTab() {
  const { data: backlinks = [] } = useSeoBacklinks();
  const { data: integrations = [] } = useSeoIntegrations();
  const [filter, setFilter] = useState<'All' | 'active' | 'lost' | 'toxic'>('All');
  const [search, setSearch] = useState('');

  const ahrefs = integrations.find((i) => i.provider === 'ahrefs');
  const semrush = integrations.find((i) => i.provider === 'semrush');
  const dataforseo = integrations.find((i) => i.provider === 'dataforseo');
  const backlinkProvider = [ahrefs, semrush, dataforseo].find((i) => i?.status === 'connected');

  const filtered = useMemo(() => {
    return backlinks.filter((b) => {
      if (filter !== 'All' && b.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!b.source_url.toLowerCase().includes(q) && !(b.anchor ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [backlinks, filter, search]);

  const stats = useMemo(() => ({
    total: backlinks.length,
    active: backlinks.filter((b) => b.status === 'active').length,
    lost: backlinks.filter((b) => b.status === 'lost').length,
    toxic: backlinks.filter((b) => b.status === 'toxic').length,
    avgDA: backlinks.length
      ? backlinks.reduce((s, b) => s + Number(b.domain_authority ?? 0), 0) / backlinks.length
      : 0,
  }), [backlinks]);

  if (!backlinkProvider && backlinks.length === 0) {
    return (
      <ConnectAPIPrompt
        provider="ahrefs"
        description="Backlinks data — new vs lost links, anchor text, toxic flags, and domain authority — requires a paid SEO API. Ahrefs, Semrush, or DataForSEO will all work."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <SmallStat label="Total backlinks" value={stats.total} />
        <SmallStat label="Active" value={stats.active} good />
        <SmallStat label="Lost" value={stats.lost} bad={stats.lost > 0} />
        <SmallStat label="Avg. DA" value={stats.avgDA.toFixed(1)} />
      </div>

      <Toolbar
        filters={['All', 'active', 'lost', 'toxic']}
        filter={filter}
        onFilterChange={(f) => setFilter(f as typeof filter)}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search source / anchor…"
      />

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.seasalt }}>
              {['Source', 'Anchor', 'Target', 'DA', 'Status', 'First seen', 'Last seen'].map((h) => (
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
            {filtered.map((b) => (
              <tr key={b.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                <td style={{ padding: '13px 16px' }}>
                  <a href={b.source_url} target="_blank" rel="noreferrer" style={{ color: C.green, textDecoration: 'none', fontWeight: 500 }}>
                    {b.source_url}
                  </a>
                </td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{b.anchor ?? '—'}</td>
                <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>{b.target_url}</td>
                <td style={{ padding: '13px 16px', fontWeight: 700, color: C.green }}>
                  {b.domain_authority != null ? Number(b.domain_authority).toFixed(1) : '—'}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <BacklinkStatus status={b.status} />
                </td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{b.first_seen ?? '—'}</td>
                <td style={{ padding: '13px 16px', color: C.slate }}>{b.last_seen ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
            No backlinks match this filter.
          </div>
        )}
      </div>
    </div>
  );
}

function SmallStat({ label, value, good = false, bad = false }: { label: string; value: number | string; good?: boolean; bad?: boolean }) {
  const color = bad ? '#C0321A' : good ? C.green : '#1a1a1a';
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '16px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.03em', marginTop: 6 }}>{value}</div>
    </div>
  );
}

function BacklinkStatus({ status }: { status: 'active' | 'lost' | 'toxic' }) {
  const palette = {
    active: { bg: C.honeydew, color: C.green },
    lost:   { bg: '#FDEAEA', color: '#C0321A' },
    toxic:  { bg: '#FFF8E1', color: '#B07D00' },
  }[status];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: 99,
        background: palette.bg,
        color: palette.color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {status}
    </span>
  );
}
