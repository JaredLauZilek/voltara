import { useEffect, useRef, useState } from 'react';
import { C } from '@/shared/tokens';
import {
  useBillCategories,
  useCreateBillCategory,
  useDeleteBillCategory,
  useBills,
} from './hooks';

interface Props {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Voltara-styled dropdown for bill categories. Mirrors SupplierCategoryPicker:
 * inline add + per-row delete (blocked by in-use validation against existing
 * bills).
 */
export function BillCategoryPicker({ value, onChange }: Props) {
  const { data: categories = [] } = useBillCategories();
  const { data: bills = [] } = useBills();
  const createMut = useCreateBillCategory();
  const deleteMut = useDeleteBillCategory();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setDraft('');
        setPendingDelete(null);
        setError(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleAdd = () => {
    const name = draft.trim();
    if (!name) return;
    if (categories.includes(name)) {
      setError('Category already exists.');
      return;
    }
    createMut.mutate(name, {
      onSuccess: () => {
        setAdding(false);
        setDraft('');
        setError(null);
        onChange(name);
      },
    });
  };

  const handleDelete = (name: string) => {
    if (bills.some((b) => b.category === name)) {
      setError(`"${name}" is in use by existing bills and can't be removed.`);
      setPendingDelete(null);
      return;
    }
    deleteMut.mutate(name, {
      onSuccess: () => {
        setPendingDelete(null);
        setError(null);
        if (value === name) onChange(categories.find((c) => c !== name) ?? '');
      },
    });
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '9px 12px',
          borderRadius: 10,
          border: `1px solid ${open ? C.green : C.border}`,
          background: C.white,
          color: value ? '#1a1a1a' : C.slate,
          fontFamily: 'Figtree',
          fontSize: 13,
          fontWeight: 500,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
        }}
      >
        <span>{value || 'Select category…'}</span>
        <span style={{ color: C.slate, fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
            zIndex: 20,
            overflow: 'hidden',
          }}
        >
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {categories.length === 0 && !adding && (
              <div style={{ padding: '14px 14px', fontSize: 12, color: C.slate, textAlign: 'center' }}>
                No categories yet.
              </div>
            )}
            {categories.map((cat) => {
              const isSelected = cat === value;
              const isPending = pendingDelete === cat;
              return (
                <div
                  key={cat}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.seasalt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? C.honeydew : 'transparent')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: isSelected ? C.honeydew : 'transparent',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? C.green : '#1a1a1a',
                  }}
                >
                  <span
                    style={{ flex: 1 }}
                    onClick={() => { onChange(cat); setOpen(false); }}
                  >
                    {cat}
                  </span>
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        style={{ fontSize: 11, fontWeight: 700, color: C.white, background: '#C0321A', border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Figtree' }}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPendingDelete(null); }}
                        style={{ fontSize: 11, fontWeight: 600, color: C.slate, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Figtree' }}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setError(null); setPendingDelete(cat); }}
                      title="Remove category"
                      style={{
                        width: 22, height: 22, borderRadius: 6, border: 'none',
                        background: 'transparent', color: C.slate, cursor: 'pointer',
                        fontSize: 14, lineHeight: 1, fontFamily: 'Figtree',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FDEAEA'; e.currentTarget.style.color = '#C0321A'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.slate; }}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#C0321A', background: '#FDEAEA' }}>
              {error}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.divider}`, padding: 8, background: C.seasalt }}>
            {adding ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); setError(null); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                    if (e.key === 'Escape') { setAdding(false); setDraft(''); setError(null); }
                  }}
                  placeholder="New category name"
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontFamily: 'Figtree',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!draft.trim() || createMut.isPending}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: C.green,
                    color: C.white,
                    fontFamily: 'Figtree',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: !draft.trim() || createMut.isPending ? 0.5 : 1,
                  }}
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setDraft(''); setError(null); }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    background: 'transparent',
                    color: C.slate,
                    fontFamily: 'Figtree',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setAdding(true); setError(null); }}
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
                + Add new category
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
