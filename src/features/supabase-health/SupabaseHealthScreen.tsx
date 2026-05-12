import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { C } from '@/shared/tokens';

// ── Types ────────────────────────────────────────────────────────────────────

interface TableStat { name: string; rows: number; bytes: number }
interface BucketStat { bucket_id: string; file_count: number; total_bytes: number }
interface DbStats {
  db_bytes: number;
  tables: TableStat[];
  storage_buckets: BucketStat[] | null;
}
interface HealthResult { ok: boolean; latencyMs: number }

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchDbStats(): Promise<DbStats> {
  const { data, error } = await supabase.rpc('get_db_stats');
  if (error) throw error;
  return data as DbStats;
}

async function fetchHealth(): Promise<HealthResult> {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) + '/rest/v1/';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const t0 = performance.now();
  try {
    // Any HTTP response (even 4xx) means the server is up — only a thrown error means unreachable
    const res = await fetch(url, { headers: { apikey: key } });
    return { ok: res.status < 500, latencyMs: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, latencyMs: -1 };
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function timeAgo(ts: number): string {
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  return `${Math.round(sec / 60)}m ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 16,
  textTransform: 'uppercase', letterSpacing: '0.06em',
};

const card: React.CSSProperties = {
  background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '20px 24px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '9px 0', borderBottom: `1px solid ${C.divider}`,
  fontSize: 13,
};

function ProgressBar({ used, limit, color = C.green }: { used: number; limit: number; color?: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  const warn = pct > 80;
  const barColor = warn ? '#C0321A' : color;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, borderRadius: 99, background: C.divider, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 400ms' }} />
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: warn ? '#C0321A' : C.slate, fontWeight: warn ? 700 : 500 }}>
        {fmtBytes(used)} used · {fmtBytes(limit)} limit · {pct.toFixed(1)}%
      </div>
    </div>
  );
}

const DB_LIMIT = 500 * 1024 * 1024;       // 500 MB free tier
const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1 GB free tier

// ── Main screen ───────────────────────────────────────────────────────────────

export function SupabaseHealthScreen() {
  const db = useQuery({ queryKey: ['supabase-health-db'], queryFn: fetchDbStats, staleTime: 0 });
  const health = useQuery({ queryKey: ['supabase-health-ping'], queryFn: fetchHealth, staleTime: 0 });

  const refetch = () => { db.refetch(); health.refetch(); };
  const lastTs = Math.min(db.dataUpdatedAt || Infinity, health.dataUpdatedAt || Infinity);
  const loading = db.isFetching || health.isFetching;

  const totalStorageBytes = (db.data?.storage_buckets ?? []).reduce((s, b) => s + b.total_bytes, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: C.slate }}>
          {lastTs && lastTs < Infinity ? `Last refreshed ${timeAgo(lastTs)}` : 'Loading…'}
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: loading ? C.seasalt : C.white,
            color: C.green, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          <span style={{ fontSize: 14, display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: loading ? 'transform 1s linear' : 'none' }}>↻</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* General */}
      <div style={card}>
        <div style={sectionTitle}>General</div>
        {health.isLoading ? (
          <div style={{ fontSize: 13, color: C.slate }}>Pinging Supabase…</div>
        ) : health.error ? (
          <StatusRow label="Project status" value="Error fetching" color="#C0321A" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={rowStyle}>
              <span style={{ color: C.slate, fontWeight: 600 }}>Project status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: health.data?.ok ? C.green : '#C0321A' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: health.data?.ok ? C.green : '#C0321A', display: 'inline-block' }} />
                {health.data?.ok ? 'Healthy' : 'Unreachable'}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={{ color: C.slate, fontWeight: 600 }}>API latency</span>
              <span style={{ fontWeight: 700, color: health.data?.latencyMs && health.data.latencyMs < 200 ? C.green : '#B07D00' }}>
                {health.data?.latencyMs && health.data.latencyMs >= 0 ? `${health.data.latencyMs} ms` : '—'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Database */}
      <div style={card}>
        <div style={sectionTitle}>Database</div>
        {db.isLoading ? (
          <div style={{ fontSize: 13, color: C.slate }}>Fetching database stats…</div>
        ) : db.error ? (
          <div style={{ fontSize: 13, color: '#C0321A' }}>Failed to load database stats.</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>Database size</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', marginTop: 4 }}>
                {fmtBytes(db.data?.db_bytes ?? 0)}
              </div>
              <ProgressBar used={db.data?.db_bytes ?? 0} limit={DB_LIMIT} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Rows per table</div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.seasalt }}>
                    {['Table', 'Rows', 'Size on disk'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(db.data?.tables ?? []).map((t, i) => (
                    <tr key={t.name} style={{ borderBottom: i < (db.data?.tables.length ?? 1) - 1 ? `1px solid ${C.divider}` : 'none' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t.name}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: C.green }}>{fmtNum(t.rows)}</td>
                      <td style={{ padding: '10px 14px', color: C.slate }}>{fmtBytes(t.bytes)}</td>
                    </tr>
                  ))}
                  {(db.data?.tables ?? []).length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '16px 14px', color: C.slate, textAlign: 'center' }}>No tables found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Storage */}
      <div style={card}>
        <div style={sectionTitle}>Storage</div>
        {db.isLoading ? (
          <div style={{ fontSize: 13, color: C.slate }}>Fetching storage stats…</div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total storage used</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.green, letterSpacing: '-0.03em', marginTop: 4 }}>
                {fmtBytes(totalStorageBytes)}
              </div>
              <ProgressBar used={totalStorageBytes} limit={STORAGE_LIMIT} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Buckets</div>
            {(db.data?.storage_buckets ?? []).length === 0 ? (
              <div style={{ fontSize: 13, color: C.slate, padding: '12px 0' }}>No files uploaded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(db.data?.storage_buckets ?? []).map((b, i, arr) => (
                  <div key={b.bucket_id} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? `1px solid ${C.divider}` : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{b.bucket_id}</div>
                      <div style={{ fontSize: 11, color: C.slate, marginTop: 2 }}>{fmtNum(b.file_count)} file{b.file_count !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: C.green }}>{fmtBytes(b.total_bytes)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* API */}
      <div style={card}>
        <div style={sectionTitle}>API &amp; Auth</div>
        <div style={{ fontSize: 12, color: C.slate, marginBottom: 14 }}>
          Request counts and auth user totals are only visible in the Supabase dashboard.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { label: 'API requests', limit: '500,000 / month', tier: 'Free tier' },
            { label: 'Database size', limit: '500 MB', tier: 'Free tier' },
            { label: 'Storage', limit: '1 GB', tier: 'Free tier' },
            { label: 'Auth users', limit: '50,000 MAU', tier: 'Free tier' },
            { label: 'Edge functions', limit: '500,000 invocations / month', tier: 'Free tier' },
          ].map(({ label, limit, tier }, i, arr) => (
            <div key={label} style={{ ...rowStyle, borderBottom: i < arr.length - 1 ? `1px solid ${C.divider}` : 'none' }}>
              <span style={{ color: C.slate, fontWeight: 600 }}>{label}</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: C.green }}>{limit}</div>
                <div style={{ fontSize: 11, color: C.slate }}>{tier}</div>
              </div>
            </div>
          ))}
        </div>
        <a
          href={`https://supabase.com/dashboard/project/${
            (import.meta.env.VITE_SUPABASE_URL as string | undefined)
              ?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ''
          }`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.seasalt, color: C.green, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
        >
          Open Supabase Dashboard ↗
        </a>
      </div>

    </div>
  );
}

function StatusRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...rowStyle, borderBottom: 'none' }}>
      <span style={{ color: C.slate, fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
