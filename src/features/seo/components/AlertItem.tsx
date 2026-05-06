import { C } from '@/shared/tokens';
import { ALERT_SEVERITY_COLORS, ALERT_TYPE_LABELS } from '../types';
import type { SeoAlert } from '../types';

interface Props {
  alert: SeoAlert;
  onAcknowledge: () => void;
  busy?: boolean;
}

export function AlertItem({ alert, onAcknowledge, busy }: Props) {
  const palette = ALERT_SEVERITY_COLORS[alert.severity];
  const acknowledged = !!alert.acknowledged_at;
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${palette.border}`,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        opacity: acknowledged ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: palette.color,
              background: palette.bg,
              padding: '3px 10px',
              borderRadius: 99,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {alert.severity}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.slate }}>
            {ALERT_TYPE_LABELS[alert.type]}
          </span>
          <span style={{ fontSize: 11, color: C.slate, marginLeft: 'auto' }}>
            {new Date(alert.created_at).toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500 }}>{alert.message}</div>
      </div>
      {!acknowledged ? (
        <button
          onClick={onAcknowledge}
          disabled={busy}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.slate,
            fontFamily: 'Figtree',
            fontSize: 12,
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          Acknowledge
        </button>
      ) : (
        <span style={{ fontSize: 11, color: C.slate, fontStyle: 'italic', flexShrink: 0 }}>
          Acknowledged
        </span>
      )}
    </div>
  );
}
