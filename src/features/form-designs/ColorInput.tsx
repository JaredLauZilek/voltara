import { C } from '@/shared/tokens';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  allowClear?: boolean;
}

export function ColorInput({ value, onChange, allowClear = false }: Props) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 38,
          height: 38,
          padding: 0,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: C.white,
          cursor: 'pointer',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={7}
        placeholder="#1B512D"
        style={{
          width: 100,
          padding: '9px 12px',
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          fontFamily: 'Figtree',
          fontSize: 13,
          outline: 'none',
        }}
      />
      {allowClear && value && (
        <button
          onClick={() => onChange('')}
          style={{
            border: 'none',
            background: 'transparent',
            color: C.slate,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Figtree',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
