import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { Toolbar } from '@/shared/components/Toolbar';
import { usePosts, useCreatePost, useUpdatePost, useDeletePost } from './hooks';
import { PostModal } from './PostModal';
import { PLATFORMS, POST_STATUSES, PLATFORM_COLORS } from './types';
import type { Post, PostInsert } from './types';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function SocialScreen() {
  const { data: posts = [] } = usePosts();
  const createMut = useCreatePost();
  const updateMut = useUpdatePost();
  const deleteMut = useDeletePost();

  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [filterPlatform, setFilterPlatform] = useState<'All' | (typeof PLATFORMS)[number]>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | Post['status']>('All');
  const [weekBase, setWeekBase] = useState(() => startOfWeek(new Date()));
  const [modal, setModal] = useState<Post | { kind: 'new'; date?: string } | null>(null);

  const visible = posts.filter(
    (p) =>
      (filterPlatform === 'All' || p.platform === filterPlatform) &&
      (filterStatus === 'All' || p.status === filterStatus)
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekBase);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekBase]);

  const counts = {
    Scheduled: posts.filter((p) => p.status === 'Scheduled').length,
    Draft: posts.filter((p) => p.status === 'Draft').length,
    Published: posts.filter((p) => p.status === 'Published').length,
    'Needs Review': posts.filter((p) => p.status === 'Needs Review').length,
  };

  const handleSave = (row: PostInsert) => {
    const cur = modal;
    if (cur && typeof cur === 'object' && 'kind' in cur) {
      createMut.mutate(row, { onSuccess: () => setModal(null) });
    } else if (cur) {
      updateMut.mutate({ id: (cur as Post).id, patch: row }, { onSuccess: () => setModal(null) });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label="Scheduled" value={counts.Scheduled} sub="Upcoming posts" accent />
        <KPICard label="Drafts" value={counts.Draft} sub="In progress" />
        <KPICard label="Published" value={counts.Published} sub="All time" />
        <KPICard label="Needs Review" value={counts['Needs Review']} sub="Awaiting approval" />
      </div>

      <Toolbar
        filters={['All', ...PLATFORMS]}
        filter={filterPlatform}
        onFilterChange={(f) => setFilterPlatform(f as typeof filterPlatform)}
        primaryLabel="+ New Post"
        onPrimary={() => setModal({ kind: 'new' })}
        extra={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              style={{
                padding: '8px 12px',
                borderRadius: 99,
                border: `1px solid ${C.border}`,
                fontFamily: 'Figtree',
                fontSize: 13,
                outline: 'none',
                background: C.white,
              }}
            >
              <option value="All">All statuses</option>
              {POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 4, background: C.divider, borderRadius: 99, padding: 3 }}>
              {(['calendar', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 99,
                    border: 'none',
                    background: view === v ? C.white : 'transparent',
                    color: view === v ? C.green : C.slate,
                    fontFamily: 'Figtree',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {view === 'calendar' && (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.divider}` }}>
            <button
              onClick={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() - 7);
                setWeekBase(d);
              }}
              style={{ background: 'transparent', border: 'none', color: C.green, fontSize: 14, cursor: 'pointer' }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>
              Week of {weekBase.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const d = new Date(weekBase);
                d.setDate(d.getDate() + 7);
                setWeekBase(d);
              }}
              style={{ background: 'transparent', border: 'none', color: C.green, fontSize: 14, cursor: 'pointer' }}
            >
              Next →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {weekDays.map((day, i) => {
              const dayKey = day.toISOString().slice(0, 10);
              const dayPosts = visible.filter((p) => p.scheduled_at.startsWith(dayKey));
              return (
                <div
                  key={i}
                  style={{
                    minHeight: 180,
                    padding: 10,
                    borderRight: i < 6 ? `1px solid ${C.divider}` : undefined,
                    cursor: dayPosts.length === 0 ? 'pointer' : 'default',
                  }}
                  onClick={() => dayPosts.length === 0 && setModal({ kind: 'new', date: dayKey })}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase' }}>
                    {WEEK_DAYS[i]}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.green, marginBottom: 8 }}>{day.getDate()}</div>
                  {dayPosts.map((p) => (
                    <div
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal(p);
                      }}
                      style={{
                        background: `${PLATFORM_COLORS[p.platform]}1A`,
                        borderLeft: `3px solid ${PLATFORM_COLORS[p.platform]}`,
                        borderRadius: 6,
                        padding: '6px 8px',
                        marginBottom: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: PLATFORM_COLORS[p.platform] }}>{p.platform}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{p.title}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {visible.map((p) => (
            <div
              key={p.id}
              onClick={() => setModal(p)}
              style={{
                background: C.white,
                borderRadius: 16,
                padding: '16px 20px',
                border: `1px solid ${C.border}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: PLATFORM_COLORS[p.platform] }}>{p.platform}</span>
                <span style={{ fontSize: 11, color: C.slate }}>{p.scheduled_at.slice(0, 10)}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>{p.title}</div>
              <div style={{ fontSize: 12, color: C.slate, lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                {p.caption}
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: C.honeydew, color: C.green }}>
                  {p.status}
                </span>
                <span style={{ fontSize: 11, color: C.slate }}>{p.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PostModal
          post={modal && typeof modal === 'object' && 'kind' in modal ? null : (modal as Post)}
          defaultDate={modal && typeof modal === 'object' && 'kind' in modal ? modal.date : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={(id) => deleteMut.mutate(id, { onSuccess: () => setModal(null) })}
        />
      )}
    </div>
  );
}
