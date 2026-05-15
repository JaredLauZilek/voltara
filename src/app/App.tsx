import { useState } from 'react';
import { C } from '@/shared/tokens';
import { VoltaraLogo } from '@/shared/components/VoltaraLogo';
import { NavItem } from '@/shared/components/NavItem';
import { NAV_SECTIONS, SCREEN_TITLES, type ScreenId } from './nav';
import { ROUTES } from './routes';
import { useUnacknowledgedAlertsCount } from '@/features/seo';
import { useCompanyProfile } from '@/features/form-designs';

const COLLAPSED_KEY = 'voltara.nav.collapsed';

export function App() {
  const [screen, setScreen] = useState<ScreenId>('overview');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const seoAlertsCount = useUnacknowledgedAlertsCount();
  const { data: companyProfile } = useCompanyProfile();
  const customLogo = companyProfile?.logo_data_url ?? null;

  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleSection = (label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

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
        <div style={{ padding: '20px 8px 16px', borderBottom: `1px solid ${C.divider}`, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 54 }}>
          {customLogo ? (
            <img
              src={customLogo}
              alt={companyProfile?.company_name ?? 'Company logo'}
              style={{ maxHeight: 40, maxWidth: '100%', objectFit: 'contain' }}
            />
          ) : (
            <VoltaraLogo height={34} />
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 12 }}>
          {NAV_SECTIONS.map((section, i) => {
            const isCollapsed = section.label ? collapsed.has(section.label) : false;
            return (
              <div key={section.label ?? `top-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.label && (
                  <button
                    onClick={() => toggleSection(section.label!)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'Figtree',
                      fontSize: 10,
                      fontWeight: 700,
                      color: C.slate,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: i === 0 ? '10px 16px 4px' : '14px 16px 4px',
                    }}
                  >
                    <span>{section.label}</span>
                    <span
                      style={{
                        fontSize: 9,
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        transition: 'transform 120ms',
                        display: 'inline-block',
                      }}
                    >
                      ▾
                    </span>
                  </button>
                )}
                {!isCollapsed && section.items.map((n) => (
                  <NavItem
                    key={n.id}
                    icon={n.icon}
                    label={n.label}
                    active={screen === n.id}
                    badge={n.id === 'seo' ? seoAlertsCount : undefined}
                    onClick={() => setScreen(n.id)}
                  />
                ))}
              </div>
            );
          })}
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
