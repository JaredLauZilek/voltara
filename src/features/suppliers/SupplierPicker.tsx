import { C } from '@/shared/tokens';
import { useSuppliers } from './hooks';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  filterStatus?: 'Active' | 'Inactive' | 'Prospect';
}

/**
 * Canonical supplier dropdown — used by Inventory & PO (outgoing) modals.
 * Single source of truth so creating a supplier here makes them available everywhere.
 */
export function SupplierPicker({ value, onChange, placeholder = 'Select supplier…', filterStatus }: Props) {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const visible = filterStatus ? suppliers.filter((s) => s.status === filterStatus) : suppliers;
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '8px 12px',
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        fontFamily: 'Figtree',
        fontSize: 13,
        outline: 'none',
        background: C.white,
      }}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {visible.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} — {s.category}
        </option>
      ))}
    </select>
  );
}
