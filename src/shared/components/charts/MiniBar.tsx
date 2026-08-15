import { C } from '@/shared/tokens';

interface Props {
  data: number[];
  color?: string;
}

export function MiniBar({ data, color = C.green }: Props) {
  // Guard the divisor. A bare Math.max(...data) returns -Infinity for an empty
  // series and 0 for an all-zero one, and 0/0 is NaN — which Chromium rejects
  // outright, so every bar disappears and the console fills with "<rect>
  // attribute height: Expected length, NaN". An all-zero month is normal on the
  // Overview KPI cards, so this is the common path, not an edge case.
  const max = Math.max(0, ...data) || 1;
  return (
    <svg width="120" height="40" style={{ display: 'block' }}>
      {data.map((v, i) => {
        // Clamped so a negative value can't produce a negative height, which is
        // equally invalid SVG.
        const bh = Math.max(0, (v / max) * 36);
        return (
          <rect
            key={i}
            x={i * 14}
            y={40 - bh}
            width="10"
            height={bh}
            rx="2"
            fill={color}
            opacity={0.7 + 0.3 * (i / data.length)}
          />
        );
      })}
    </svg>
  );
}
