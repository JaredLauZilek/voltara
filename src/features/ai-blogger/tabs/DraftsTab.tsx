import { useState } from 'react';
import { C } from '@/shared/tokens';
import {
  useDrafts, useUpdateDraft, useDeleteDraft,
  useGenerateDraft, usePublishDraft,
  useKeywords, useCompetitors,
} from '../hooks';
import type { BlogDraft, DraftStatus } from '../types';
import { DraftEditorModal } from '../components/DraftEditorModal';
import { GenerateDraftModal } from '../components/GenerateDraftModal';

const STATUS_COLORS: Record<DraftStatus, { bg: string; color: string }> = {
  draft:      { bg: '#F3F3F3', color: '#767B77' },
  approved:   { bg: '#FFF8E1', color: '#B07D00' },
  scheduled:  { bg: '#E3F0FF', color: '#1A62C0' },
  publishing: { bg: '#E3F0FF', color: '#1A62C0' },
  published:  { bg: '#E4F3E3', color: '#1B512D' },
  failed:     { bg: '#FDEAEA', color: '#C0321A' },
};

export function DraftsTab() {
  const { data: drafts = [] } = useDrafts();
  const { data: keywords = [] } = useKeywords();
  const { data: competitors = [] } = useCompetitors();
  const updateMut = useUpdateDraft();
  const deleteMut = useDeleteDraft();
  const generateMut = useGenerateDraft();
  const publishMut = usePublishDraft();

  const [editing, setEditing] = useState<BlogDraft | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleApprove = (d: BlogDraft) => {
    updateMut.mutate({ id: d.id, patch: { status: 'approved', approved_at: new Date().toISOString() } });
  };
  const handlePublish = (d: BlogDraft) => {
    setActionError(null);
    publishMut.mutate(d.id, { onError: (e) => setActionError((e as Error).message) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: C.slate }}>
          {drafts.length} post{drafts.length === 1 ? '' : 's'} · most recent first
        </span>
        <button
          onClick={() => setShowGenerate(true)}
          style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          ✨ Generate New Draft
        </button>
      </div>

      {actionError && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '10px 12px', background: '#FDEAEA', borderRadius: 8 }}>
          {actionError}
        </div>
      )}

      {drafts.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: C.slate, fontSize: 14, background: C.white, borderRadius: 16, border: `1px solid ${C.border}` }}>
          No drafts yet. Click <strong>Generate New Draft</strong> to ask the agent to write one,
          or seed a draft manually.
        </div>
      ) : (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.seasalt }}>
                {['Title', 'Status', 'Keywords', 'Updated', ''].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.slate, letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => {
                const sc = STATUS_COLORS[d.status];
                return (
                  <tr
                    key={d.id}
                    onClick={() => setEditing(d)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderBottom: `1px solid ${C.divider}`, cursor: 'pointer' }}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#1a1a1a', maxWidth: 360 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                      {d.wix_post_url && (
                        <a
                          href={d.wix_post_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 11, color: C.green, textDecoration: 'none', fontWeight: 600 }}
                        >
                          ↗ View on Wix
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.target_keywords.length === 0 ? '—' : d.target_keywords.join(', ')}
                    </td>
                    <td style={{ padding: '13px 16px', color: C.slate, fontSize: 12 }}>
                      {new Date(d.updated_at).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}
                    </td>
                    <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {d.status === 'draft' && (
                          <button
                            onClick={() => handleApprove(d)}
                            disabled={updateMut.isPending}
                            style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.green}`, background: 'transparent', color: C.green, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            Approve
                          </button>
                        )}
                        {(d.status === 'approved' || d.status === 'scheduled' || d.status === 'failed') && (
                          <button
                            onClick={() => handlePublish(d)}
                            disabled={publishMut.isPending}
                            style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          >
                            {publishMut.isPending ? 'Publishing…' : 'Publish'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <DraftEditorModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => updateMut.mutate({ id: editing.id, patch }, { onSuccess: () => setEditing(null) })}
          onDelete={() => deleteMut.mutate(editing.id, { onSuccess: () => setEditing(null) })}
          isSaving={updateMut.isPending}
        />
      )}

      {showGenerate && (
        <GenerateDraftModal
          keywords={keywords}
          competitors={competitors}
          isGenerating={generateMut.isPending}
          generateError={generateMut.error as Error | null}
          onGenerate={(args) =>
            generateMut.mutate(args, { onSuccess: () => setShowGenerate(false) })
          }
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}
