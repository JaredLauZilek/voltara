import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useCustomers } from './hooks';
import type { Customer } from './types';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
  filter?: (customer: Customer) => boolean;
}

/**
 * Canonical customer dropdown — used by Invoice / Quote / PO (incoming) / Order modals
 * so a customer is picked from the same source everywhere. Never replace with a free-text input.
 */
export function CustomerPicker({ value, onChange, placeholder = 'Select customer…', filter }: Props) {
  const { data: customers = [], isLoading } = useCustomers();
  const visible = filter ? customers.filter(filter) : customers;
  const options = visible.map((c) => ({ value: c.id, label: c.name, meta: c.type }));
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
