import { C } from '@/shared/tokens';
import { useCustomers } from './hooks';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}

/**
 * Canonical customer dropdown — used by Invoice / Quote / PO (incoming) / Order modals
 * so a customer is picked from the same source everywhere. Never replace with a free-text input.
 */
export function CustomerPicker({ value, onChange, placeholder = 'Select customer…' }: Props) {
  const { data: customers = [], isLoading } = useCustomers();
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
      {customers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.type})
        </option>
      ))}
    </select>
  );
}
