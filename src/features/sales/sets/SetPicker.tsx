import { useEffect, useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import { useQuoteSets } from './hooks';
import { SetManagerModal } from './SetManagerModal';
import type { QuoteSet } from './types';

interface Props {
  onInsert: (set: QuoteSet) => void;
}

/** Compact button + dropdown for picking a predefined line-item set.
 *  Sits next to "+ Add Item" inside QuoteModal. */
export function SetPicker({ onInsert }: Props) {
  const { data: sets = [] } = useQuoteSets();
  const [open, setOpen] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <>
      <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: C.slate,
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '8px 14px',
            cursor: 'pointer',
            fontFamily: 'Figtree',
          }}
        >
          + Insert Set ▾
        </button>

        {open && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              minWidth: 260,
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
              zIndex: 30,
              overflow: 'hidden',
            }}
          >
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {sets.length === 0 ? (
                <div style={{ padding: '14px 14px', fontSize: 12, color: C.slate, textAlign: 'center' }}>
                  No sets yet.
                </div>
              ) : (
                sets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onInsert(s); setOpen(false); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.seasalt)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: '10px 14px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'Figtree',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{s.name}</span>
                    <span style={{ fontSize: 11, color: C.slate }}>
                      {s.line_items.length} item{s.line_items.length === 1 ? '' : 's'}
                      {s.description ? ` · ${s.description}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div style={{ borderTop: `1px solid ${C.divider}`, padding: 6, background: C.seasalt }}>
              <button
                type="button"
                onClick={() => { setShowManage(true); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: `1px dashed ${C.border}`,
                  background: 'transparent',
                  color: C.green,
                  fontFamily: 'Figtree',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ⚙ Manage sets…
              </button>
            </div>
          </div>
        )}
      </div>

      {showManage && <SetManagerModal onClose={() => setShowManage(false)} />}
    </>
  );
}
