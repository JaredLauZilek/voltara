import { C } from '@/shared/tokens';
import { useSalesManagers } from './hooks';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export function SalesManagerPicker({ value, onChange, placeholder = 'Assign sales manager…' }: Props) {
  const { data: managers = [], isLoading } = useSalesManagers();
  const active = managers.filter((m) => m.active);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '9px 12px',
        borderRadius: 10,
        border: `1px solid ${C.border}`,
        fontFamily: 'Figtree',
        fontSize: 13,
        outline: 'none',
        background: C.white,
      }}
    >
      <option value="">{placeholder}</option>
      {active.map((m) => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  );
}
