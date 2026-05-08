import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useProducts } from './hooks';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}

/**
 * Canonical product/service dropdown — used by Invoice / Quote / PO line items.
 * Products and services are grouped separately. Adding a SKU or service in the
 * Inventory & Products screen makes it appear here immediately.
 */
export function ProductPicker({ value, onChange, placeholder = 'Select product or service…' }: Props) {
  const { data: products = [], isLoading } = useProducts();
  const options = products.map((p) => ({
    value: p.id,
    label: p.name,
    group: p.is_service ? 'Services' : 'Products',
  }));
  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={(id) => { if (id) onChange(id); }}
      placeholder={isLoading ? 'Loading…' : placeholder}
      disabled={isLoading}
      style={{ fontSize: 12, padding: '7px 32px 7px 10px', borderRadius: 8 }}
    />
  );
}
