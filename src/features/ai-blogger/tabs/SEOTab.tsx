import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { useDrafts, useSnapshots, useFetchSeoSnapshot } from '../hooks';
import type { BlogDraft } from '../types';

export function SEOTab() {
  const { data: drafts = [] } = useDrafts();
  const published = useMemo(() => drafts.filter((d) => d.status === 'published'), [drafts]);

  const [selectedId, setSelectedId] = useState<string | null>(published[0]?.id ?? null);
  const fetchMut = useFetchSeoSnapshot();
  const { data: snapshots = [] } = useSnapshots(selectedId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: 14, fontSize: 13, fontWeight: 700, color: C.green, borderBottom: `1px solid ${C.divider}` }}>
          Published posts
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {published.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: C.slate, fontSize: 12 }}>
              No published posts yet.
            </div>
          )}
          {published.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              style={{
                width: '100%', padding: '10px 14px', border: 'none',
                background: selectedId === d.id ? C.honeydew : 'transparent',
                color: selectedId === d.id ? C.green : '#1a1a1a',
                textAlign: 'left', cursor: 'pointer', fontFamily: 'Figtree',
                fontSize: 12, fontWeight: 600,
                borderBottom: `1px solid ${C.divider}`,
              }}
            >
              {d.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 18 }}>
        {!selectedId ? (
          <div style={{ padding: 28, textAlign: 'center', color: C.slate, fontSize: 13 }}>
            Pick a post from the left to see its SEO snapshots.
          </div>
        ) : (
          <SnapshotsView
            draftId={selectedId}
            draft={drafts.find((d) => d.id === selectedId)}
            snapshots={snapshots}
            onFetch={() => fetchMut.mutate(selectedId)}
            isFetching={fetchMut.isPending}
            error={fetchMut.error as Error | null}
          />
        )}
      </div>
    </div>
  );
}

function SnapshotsView({
  draftId, draft, snapshots, onFetch, isFetching, error,
}: {
  draftId: string;
  draft: BlogDraft | undefined;
  snapshots: { id: number; fetched_at: string; metrics: Record<string, unknown> }[];
  onFetch: () => void;
  isFetching: boolean;
  error: Error | null;
}) {
  void draftId;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{draft?.title ?? '—'}</div>
          {draft?.wix_post_url && (
            <a href={draft.wix_post_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.green }}>
              ↗ {draft.wix_post_url}
            </a>
          )}
        </div>
        <button
          onClick={onFetch}
          disabled={isFetching}
          style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, fontFamily: 'Figtree', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          {isFetching ? 'Fetching…' : '↻ Fetch Ahrefs snapshot'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '10px 12px', background: '#FDEAEA', borderRadius: 8, marginBottom: 12 }}>
          {error.message}
        </div>
      )}

      {snapshots.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', color: C.slate, fontSize: 13 }}>
          No snapshots yet. Click <strong>Fetch</strong> above or wait for the scheduled tick.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {snapshots.map((s) => (
            <div key={s.id} style={{ padding: '10px 12px', background: C.seasalt, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.slate, marginBottom: 4 }}>
                {new Date(s.fetched_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              <pre style={{ margin: 0, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#1a1a1a' }}>
                {JSON.stringify(s.metrics, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
