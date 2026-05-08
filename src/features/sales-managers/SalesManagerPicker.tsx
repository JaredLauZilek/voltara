import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useSalesManagers } from './hooks';

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}

export function SalesManagerPicker({ value, onChange, placeholder = 'Assign sales manager…' }: Props) {
  const { data: managers = [], isLoading } = useSalesManagers();
  const active = managers.filter((m) => m.active);
  const options = active.map((m) => ({ value: m.id, label: m.name }));
  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={isLoading ? 'Loading…' : placeholder}
      nullable
      nullLabel="No sales manager assigned"
      disabled={isLoading}
    />
  );
}
