import { C } from '@/shared/tokens';

interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({ data, color = C.green, height = 40 }: Props) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = height;
  // A single-point series makes the divisor 0, and 0/0 is NaN — same failure
  // mode as MiniBar had. One point draws at x=0.
  const span = data.length - 1 || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / span) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
