import { useState } from 'react';
import { C } from '@/shared/tokens';
import { VoltaraLogo } from '@/shared/components/VoltaraLogo';
import { NavItem } from '@/shared/components/NavItem';
import { NAV, SCREEN_TITLES, type ScreenId } from './nav';
import { ROUTES } from './routes';
import { useUnacknowledgedAlertsCount } from '@/features/seo';

export function App() {
  const [screen, setScreen] = useState<ScreenId>('overview');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const seoAlertsCount = useUnacknowledgedAlertsCount();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.seasalt }}>
      <aside
        style={{
          width: 224,
          flexShrink: 0,
          background: C.white,
          borderRight: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 12px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 8px 16px', borderBottom: `1px solid ${C.divider}`, marginBottom: 8 }}>
          <VoltaraLogo height={34} />
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 12 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.slate,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '10px 16px 4px',
            }}
          >
            Main
          </div>
          {NAV.map((n) => (
            <NavItem
              key={n.id}
              icon={n.icon}
              label={n.label}
              active={screen === n.id}
              badge={n.id === 'seo' ? seoAlertsCount : undefined}
              onClick={() => setScreen(n.id)}
            />
          ))}
        </nav>

        <div style={{ borderTop: `1px solid ${C.divider}`, padding: '14px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: C.green,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.yellow,
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            A
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Admin User
            </div>
            <div style={{ fontSize: 11, color: C.slate }}>Voltara Ops</div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header
          style={{
            height: 60,
            flexShrink: 0,
            background: C.white,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 28px',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.green, letterSpacing: '-0.02em' }}>
              {SCREEN_TITLES[screen]}
            </div>
            <div style={{ fontSize: 11, color: C.slate }}>{today} · Kuala Lumpur</div>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>{ROUTES[screen]}</div>
      </main>
    </div>
  );
}
