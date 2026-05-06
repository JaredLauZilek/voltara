import { C } from '@/shared/tokens';
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
  const physical = products.filter((p) => !p.is_service);
  const services = products.filter((p) => p.is_service);

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={isLoading}
      style={{
        padding: '7px 10px',
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        fontFamily: 'Figtree',
        fontSize: 12,
        outline: 'none',
        background: C.white,
        width: '100%',
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {physical.length > 0 && (
        <optgroup label="Products">
          {physical.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>
      )}
      {services.length > 0 && (
        <optgroup label="Services">
          {services.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
