import { useEffect, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { ProductPicker, useProducts } from '@/features/products';
import { formatRM } from '@/shared/lib/format';
import { useQuoteSets, useCreateQuoteSet, useUpdateQuoteSet, useDeleteQuoteSet } from './hooks';
import type { QuoteSet, QuoteSetItem } from './types';

interface Props {
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};

/** Lightweight CRUD modal for quote sets — list view + inline editor. */
export function SetManagerModal({ onClose }: Props) {
  const { data: sets = [] } = useQuoteSets();
  const { data: products = [] } = useProducts();
  const createMut = useCreateQuoteSet();
  const updateMut = useUpdateQuoteSet();
  const deleteMut = useDeleteQuoteSet();

  const [editing, setEditing] = useState<QuoteSet | 'new' | null>(null);

  // Reset all mutation errors when the editor opens/closes so banners don't
  // bleed across sessions. (Same locked pattern as the rest of the app.)
  useEffect(() => {
    createMut.reset();
    updateMut.reset();
    deleteMut.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (editing !== null) {
    return (
      <SetEditor
        initial={editing === 'new' ? null : editing}
        products={products}
        isSaving={createMut.isPending || updateMut.isPending}
        saveError={(createMut.error ?? updateMut.error) as Error | null}
        onClose={() => setEditing(null)}
        onSave={(set) => {
          if (editing === 'new') {
            createMut.mutate(set, { onSuccess: () => setEditing(null) });
          } else {
            updateMut.mutate({ id: editing.id, patch: set }, { onSuccess: () => setEditing(null) });
          }
        }}
        onDelete={editing !== 'new'
          ? () => deleteMut.mutate(editing.id, { onSuccess: () => setEditing(null) })
          : undefined}
      />
    );
  }

  return (
    <Modal title="Manage Sets" subtitle="Pre-defined line-item combos" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: C.slate }}>
          {sets.length} set{sets.length === 1 ? '' : 's'} defined
        </span>
        <button
          onClick={() => setEditing('new')}
          style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: C.green, color: C.white, fontFamily: 'Figtree', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + New Set
        </button>
      </div>

      {sets.length === 0 ? (
        <div style={{ padding: 28, textAlign: 'center', color: C.slate, fontSize: 13, background: C.seasalt, borderRadius: 12 }}>
          No sets yet. Click <strong>+ New Set</strong> to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sets.map((s) => {
            const total = s.line_items.reduce((sum, it) => {
              const p = products.find((x) => x.id === it.product_id);
              return sum + (it.qty * (p?.price ?? 0));
            }, 0);
            return (
              <button
                key={s.id}
                onClick={() => setEditing(s)}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: C.white,
                  fontFamily: 'Figtree',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.slate }}>
                    {s.line_items.length} item{s.line_items.length === 1 ? '' : 's'}
                    {s.description ? ` · ${s.description}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.slate }}>{formatRM(total)}</div>
                <span style={{ color: C.slate, fontSize: 14 }}>›</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex' }}>
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

interface EditorProps {
  initial: QuoteSet | null;
  products: ReturnType<typeof useProducts>['data'] extends infer T ? Exclude<T, undefined> : never;
  isSaving: boolean;
  saveError: Error | null;
  onClose: () => void;
  onSave: (set: { id: string; name: string; description: string | null; line_items: QuoteSetItem[] }) => void;
  onDelete?: () => void;
}

function SetEditor({ initial, products, isSaving, saveError, onClose, onSave, onDelete }: EditorProps) {
  const isNew = !initial;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<{ id: string; name: string; description: string | null; line_items: QuoteSetItem[] }>(
    initial ?? {
      id: `SET-${Date.now().toString(36).toUpperCase()}`,
      name: '',
      description: null,
      line_items: [],
    }
  );

  const addItem = () => {
    const first = products[0];
    setForm((f) => ({ ...f, line_items: [...f.line_items, { product_id: first?.id ?? '', qty: 1 }] }));
  };
  const updateItem = (i: number, patch: Partial<QuoteSetItem>) =>
    setForm((f) => ({ ...f, line_items: f.line_items.map((li, idx) => idx === i ? { ...li, ...patch } : li) }));
  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, idx) => idx !== i) }));

  const total = form.line_items.reduce((s, it) => {
    const p = products.find((x) => x.id === it.product_id);
    return s + (it.qty * (p?.price ?? 0));
  }, 0);

  const canSave = !!form.name.trim() && form.line_items.length > 0 && form.line_items.every((it) => !!it.product_id);

  return (
    <Modal title={isNew ? 'New Set' : form.name || 'Edit Set'} subtitle={isNew ? undefined : form.id} onClose={onClose}>
      <div>
        <label style={labelStyle}>Name</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Home charger starter kit"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Description (optional)</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
          rows={2}
          placeholder="Short note for picker hint"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label style={{ ...labelStyle, marginBottom: 10 }}>Line items</label>
        {form.line_items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <ProductPicker
              value={item.product_id || null}
              onChange={(id) => updateItem(i, { product_id: id })}
            />
            <input
              type="number"
              min="0"
              value={item.qty}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                updateItem(i, { qty: Number.isFinite(n) && n >= 0 ? n : 0 });
              }}
              style={{ ...inputStyle, padding: '7px 8px', fontSize: 12, textAlign: 'center' }}
            />
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textAlign: 'right' }}>
              {formatRM(item.qty * (products.find((p) => p.id === item.product_id)?.price ?? 0))}
            </div>
            <button
              onClick={() => removeItem(i)}
              style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', color: C.error ?? '#C0321A' }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addItem}
          style={{ marginTop: form.line_items.length > 0 ? 4 : 0, fontSize: 12, fontWeight: 600, color: C.green, background: C.honeydew, border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Figtree' }}
        >
          + Add Item
        </button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, marginTop: 12, borderTop: `1px solid ${C.divider}` }}>
          <span style={{ fontSize: 12, color: C.slate, marginRight: 12 }}>Total (at current prices)</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{formatRM(total)}</span>
        </div>
      </div>

      {saveError && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600, padding: '8px 12px', background: '#FDEAEA', borderRadius: 8 }}>
          {saveError.message || 'Save failed.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>Permanent — cannot be undone.</span>
              <button
                onClick={onDelete}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0321A', color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FDEAEA', background: 'transparent', color: '#C0321A', fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Delete
            </button>
          )
        )}
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.slate, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!canSave || isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !canSave || isSaving ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: !canSave ? 'not-allowed' : isSaving ? 'wait' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Create Set' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
