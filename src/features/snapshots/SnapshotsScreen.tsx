import { useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { useSnapshots, useTriggerSnapshot, useDeleteSnapshot } from './hooks';
import { signedDownloadUrl } from './api';
import type { SnapshotMeta } from './types';

const fmtBytes = (n: number | null): string => {
  if (n === null || n === undefined) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-MY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

const STATUS_PILL: Record<SnapshotMeta['status'], { bg: string; color: string; label: string }> = {
  completed: { bg: C.honeydew,  color: C.green,    label: 'Completed' },
  pending:   { bg: '#FFF8E1',   color: '#B07D00',  label: 'Running…'  },
  failed:    { bg: '#FDEAEA',   color: '#C0321A',  label: 'Failed'    },
};

export function SnapshotsScreen() {
  const { data: snapshots = [], isLoading } = useSnapshots();
  const triggerMut = useTriggerSnapshot();
  const deleteMut  = useDeleteSnapshot();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const completed = snapshots.filter((s) => s.status === 'completed');
  const last = completed[0] ?? null;
  const totalBytes = completed.reduce((s, x) => s + (x.bytes ?? 0), 0);

  const handleTrigger = async () => {
    setError(null);
    const res = await triggerMut.mutateAsync();
    if (!res.ok) setError(res.error ?? 'Snapshot failed');
  };

  const handleDownload = async (s: SnapshotMeta) => {
    try {
      const url = await signedDownloadUrl(s.storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = s.storage_path;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      setError(`Download failed: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Last snapshot" value={last ? fmtDate(last.taken_at) : '—'}
                 sub={last ? `${fmtBytes(last.bytes)} · ${last.trigger}` : 'No snapshots yet'} accent />
        <KPICard label="Snapshots kept" value={completed.length} sub="Retention: 3 most recent" />
        <KPICard label="Total storage" value={fmtBytes(totalBytes)} sub="In backups bucket" />
        <KPICard label="Schedule" value="Daily" sub="02:00 Asia/Kuala_Lumpur" />
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Snapshots</div>
          <button
            onClick={handleTrigger}
            disabled={triggerMut.isPending}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: triggerMut.isPending ? C.slate : C.green,
              color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700,
              cursor: triggerMut.isPending ? 'wait' : 'pointer',
            }}
          >
            {triggerMut.isPending ? 'Snapshotting…' : '+ Snapshot now'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.slate, marginBottom: 18 }}>
          A snapshot bundles every public table as JSON plus every file in the
          attachments bucket into one zip. The 3 most recent are kept; older
          ones are deleted automatically when a new one is written.
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: '#FDEAEA', color: '#C0321A', fontSize: 12, fontWeight: 600, borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div style={{ background: C.white, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Taken at', 'Trigger', 'Status', 'Size', 'Rows', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => {
                const sc = STATUS_PILL[s.status];
                const rowCount = s.table_counts
                  ? Object.values(s.table_counts).reduce((a, b) => a + Number(b), 0)
                  : null;
                const isExpanded = expanded === s.id;
                return (
                  <>
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.divider}` }}>
                      <td style={{ padding: '11px 14px', fontWeight: 600 }}>{fmtDate(s.taken_at)}</td>
                      <td style={{ padding: '11px 14px', color: C.slate, fontSize: 12 }}>{s.trigger}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', color: C.slate }}>{fmtBytes(s.bytes)}</td>
                      <td style={{ padding: '11px 14px', color: C.slate }}>
                        {rowCount !== null ? (
                          <button
                            onClick={() => setExpanded(isExpanded ? null : s.id)}
                            style={{ background: 'none', border: 'none', color: C.green, fontFamily: 'Figtree', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                          >
                            {rowCount.toLocaleString()} {isExpanded ? '▴' : '▾'}
                          </button>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {s.status === 'completed' && (
                          <button
                            onClick={() => handleDownload(s)}
                            style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 6 }}
                          >
                            ↓ Download
                          </button>
                        )}
                        {confirmDelete === s.id ? (
                          <>
                            <button
                              onClick={() => { deleteMut.mutate({ id: s.id, storagePath: s.storage_path }); setConfirmDelete(null); }}
                              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: C.error, color: C.white, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginRight: 4 }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(s.id)}
                            title="Delete this snapshot"
                            style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && s.table_counts && (
                      <tr key={`${s.id}-detail`} style={{ background: C.seasalt }}>
                        <td colSpan={6} style={{ padding: '12px 18px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, fontSize: 12, color: C.slate }}>
                            {Object.entries(s.table_counts)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([table, count]) => (
                                <div key={table}>
                                  <span style={{ color: C.ink, fontWeight: 600 }}>{table}</span>
                                  <span style={{ marginLeft: 6 }}>{count}</span>
                                </div>
                              ))}
                          </div>
                          {s.error && (
                            <div style={{ marginTop: 10, padding: '8px 10px', background: '#FDEAEA', color: '#C0321A', fontSize: 12, fontWeight: 600, borderRadius: 6 }}>
                              {s.error}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {!isLoading && snapshots.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: C.slate, fontSize: 14 }}>
              No snapshots yet. Click <strong>+ Snapshot now</strong> to take the first one.
            </div>
          )}
        </div>
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: '14px 18px', fontSize: 12, color: C.slate, lineHeight: 1.6 }}>
        <strong style={{ color: C.green }}>What's inside</strong> &middot; <code>manifest.json</code> (version + table counts) &middot;
        <code>tables/*.json</code> (one file per public table, JSON-encoded rows) &middot;
        <code>attachments/*</code> (every blob from the attachments bucket).
        Use <code>scripts/restore-snapshot.ts</code> to restore — see the script header for usage.
      </div>
    </div>
  );
}
