import { C } from '@/shared/tokens';

interface Props {
  delta: number | null | undefined;
  // Most metrics are "up is good". For ranking position, lower is better — pass invert.
  invert?: boolean;
  unit?: string;
}

export function TrendChip({ delta, invert = false, unit = '' }: Props) {
  if (delta == null || delta === 0) {
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: C.slate, padding: '2px 8px', borderRadius: 99, background: C.divider }}>
        — {unit}
      </span>
    );
  }
  const positive = invert ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? '↑' : '↓';
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: positive ? '#22a14b' : '#C0321A',
        background: positive ? C.honeydew : '#FDEAEA',
        padding: '2px 8px',
        borderRadius: 99,
      }}
    >
      {arrow} {Math.abs(delta)}{unit}
    </span>
  );
}
