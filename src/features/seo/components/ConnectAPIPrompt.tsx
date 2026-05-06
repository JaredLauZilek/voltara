import { C } from '@/shared/tokens';
import type { IntegrationProvider } from '../types';
import { PROVIDER_LABELS } from '../types';

interface Props {
  provider: IntegrationProvider;
  description: string;
  status?: 'not_connected' | 'connected' | 'error';
}

export function ConnectAPIPrompt({ provider, description, status = 'not_connected' }: Props) {
  const label = PROVIDER_LABELS[provider];
  const isError = status === 'error';
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: C.honeydew,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: C.green,
          fontWeight: 700,
        }}
      >
        ⚡
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Connect {label}</div>
        <div style={{ fontSize: 13, color: C.slate, marginTop: 4, maxWidth: 480 }}>{description}</div>
      </div>
      {isError && (
        <div style={{ fontSize: 12, color: '#C0321A', fontWeight: 600 }}>
          Last sync failed. Check credentials or retry.
        </div>
      )}
      <button
        style={{
          padding: '10px 22px',
          borderRadius: 10,
          border: 'none',
          background: C.green,
          color: C.white,
          fontFamily: 'Figtree',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          marginTop: 4,
        }}
        onClick={() => alert(`Setup flow for ${label} comes in Wave 2 (edge functions + OAuth).`)}
      >
        {isError ? 'Reconnect' : 'Connect'}
      </button>
    </div>
  );
}
