import { useEffect, useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { TASK_PRIORITIES } from './types';
import type { Task, TaskInsert, TaskPriority } from './types';

interface Props {
  task: Task | null;
  onClose: () => void;
  onSave: (row: TaskInsert) => void;
  isSaving?: boolean;
  onDelete?: (id: string) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
  background: C.white,
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

export function TaskModal({ task, onClose, onSave, isSaving = false, onDelete }: Props) {
  const isNew = !task;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<TaskInsert>(
    task ?? {
      id: `TSK-${String(Date.now()).slice(-4)}`,
      title: '',
      notes: null,
      due_date: null,
      priority: 'Normal',
      done: false,
      done_at: null,
      related_kind: null,
      related_id: null,
    }
  );

  // Reset the confirm-delete state whenever the modal switches rows.
  useEffect(() => {
    setConfirmDelete(false);
  }, [task?.id]);

  const valid = !!form.title?.trim();

  return (
    <Modal title={isNew ? 'New Task' : task?.id ?? 'Task'} onClose={onClose}>
      <div>
        <label style={labelStyle}>Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Follow up with Acme on quote"
          style={inputStyle}
          autoFocus
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input
            type="date"
            value={form.due_date ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value || null }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Priority</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {TASK_PRIORITIES.map((p) => {
              const active = (form.priority ?? 'Normal') === p;
              return (
                <button
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p as TaskPriority }))}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 99,
                    border: `2px solid ${active ? C.green : C.border}`,
                    background: active ? C.honeydew : C.white,
                    color: active ? C.green : C.slate,
                    fontFamily: 'Figtree',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
          rows={4}
          placeholder="Context, links, who said what…"
          style={{ ...inputStyle, padding: '10px 12px', resize: 'vertical', lineHeight: 1.45, fontFamily: 'Figtree', whiteSpace: 'pre-wrap' }}
        />
      </div>

      {!isNew && (
        <div>
          <label style={labelStyle}>Status</label>
          <button
            onClick={() =>
              setForm((f) => ({
                ...f,
                done: !f.done,
                done_at: !f.done ? new Date().toISOString() : null,
              }))
            }
            style={{
              padding: '6px 14px',
              borderRadius: 99,
              border: `2px solid ${form.done ? C.green : C.border}`,
              background: form.done ? C.honeydew : C.white,
              color: form.done ? C.green : C.slate,
              fontFamily: 'Figtree',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {form.done ? '✓ Done' : 'Mark as done'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {!isNew && onDelete && task && (
          confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>
                Permanent — cannot be undone.
              </span>
              <button
                onClick={() => onDelete(task.id)}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: C.error, color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
              style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.errorBg}`, background: 'transparent', color: C.error, fontFamily: 'Figtree', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
          onClick={() => onSave({ ...form, due_date: form.due_date || null })}
          disabled={!valid || isSaving}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: !valid || isSaving ? C.slate : C.green,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: isSaving ? 'wait' : (!valid ? 'not-allowed' : 'pointer'),
            opacity: isSaving ? 0.8 : 1,
          }}
        >
          {isSaving ? 'Saving…' : isNew ? 'Create Task' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  );
}

