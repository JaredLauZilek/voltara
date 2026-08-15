import { C } from '@/shared/tokens';

interface Props {
  /** Position of the row this handle belongs to. */
  index: number;
  /** Total rows, used to disable the last row's down arrow. */
  count: number;
  onMove: (from: number, to: number) => void;
  /** Row noun used in the accessible label — "item", "line", … */
  label?: string;
}

/**
 * Stacked up/down control for reordering a list row.
 *
 * Lives on the left of a row, where a drag handle would sit, so the row's own
 * fields still read left-to-right. Occupies a 22px grid column — add one to the
 * row's gridTemplateColumns (and to any header row above it) when adopting it.
 */
export function ReorderHandle({ index, count, onMove, label = 'item' }: Props) {
  const isFirst = index === 0;
  const isLast = index === count - 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <button
        type="button"
        onClick={() => onMove(index, index - 1)}
        disabled={isFirst}
        title={`Move ${label} up`}
        aria-label={`Move ${label} ${index + 1} up`}
        style={btn(isFirst)}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => onMove(index, index + 1)}
        disabled={isLast}
        title={`Move ${label} down`}
        aria-label={`Move ${label} ${index + 1} down`}
        style={btn(isLast)}
      >
        ▼
      </button>
    </div>
  );
}

const btn = (disabled: boolean): React.CSSProperties => ({
  width: 22,
  height: 13,
  padding: 0,
  borderRadius: 6,
  border: `1px solid ${C.border}`,
  background: 'transparent',
  color: disabled ? C.border : C.slate,
  fontSize: 7,
  lineHeight: 1,
  cursor: disabled ? 'default' : 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
