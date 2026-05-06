import { C } from '@/shared/tokens';
import { useProducts } from './hooks';

interface Props {
  value: string | null;
  onChange: (id: string) => void;
  placeholder?: string;
}

/**
 * Canonical product (SKU) dropdown — used by Invoice / Quote / PO line items.
 * Adding a SKU in the Inventory & Products screen makes it appear in every
 * line-item dropdown immediately. Never replace with a hardcoded list.
 */
export function ProductPicker({ value, onChange, placeholder = 'Select product…' }: Props) {
  const { data: products = [], isLoading } = useProducts();
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
      <option value="" disabled>
        {placeholder}
      </option>
      {products.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
