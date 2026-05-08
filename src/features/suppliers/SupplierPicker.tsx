import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useSuppliers } from './hooks';
import type { SupplierKind } from './types';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  filterStatus?: 'Active' | 'Inactive' | 'Prospect';
  // Restrict the dropdown to specific kinds. Defaults to Supplier-only since this picker
  // is used for purchase orders, which can't be tied to vendors or contractors.
  filterKinds?: SupplierKind[];
}

/**
 * Canonical supplier dropdown — used by Inventory & PO (outgoing) modals.
 * Single source of truth so creating a supplier here makes them available everywhere.
 */
export function SupplierPicker({
  value,
  onChange,
  placeholder = 'Select supplier…',
  filterStatus,
  filterKinds = ['Supplier'],
}: Props) {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const visible = suppliers.filter((s) => {
    if (filterStatus && s.status !== filterStatus) return false;
    if (!filterKinds.includes((s.kind ?? 'Supplier') as SupplierKind)) return false;
    return true;
  });
  const options = visible.map((s) => ({ value: s.id, label: s.name, meta: s.category }));
  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(id) => { if (id) onChange(id); }}
      placeholder={isLoading ? 'Loading…' : placeholder}
      disabled={isLoading}
    />
  );
}
