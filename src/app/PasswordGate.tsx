import { useEffect, useState, type ReactNode } from 'react';
import { C } from '@/shared/tokens';
import { VoltaraLogo } from '@/shared/components/VoltaraLogo';

const STORAGE_KEY = 'voltara.unlocked';
const PASSWORD = '1234';

interface Props {
  children: ReactNode;
}

/**
 * Frontend gate to keep drive-by visitors out of a Vercel-deployed instance.
 * Not a real auth layer — the Supabase anon key still ships in the bundle —
 * but it stops anyone who stumbles onto the URL from clicking around in the
 * UI and accidentally mutating data. Unlock persists per-device via localStorage.
 */
export function PasswordGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!unlocked) {
      const input = document.getElementById('voltara-password-input') as HTMLInputElement | null;
      input?.focus();
    }
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entry === PASSWORD) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
      setUnlocked(true);
    } else {
      setError(true);
      setEntry('');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.seasalt,
        padding: 20,
        fontFamily: 'Figtree',
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: C.white,
          borderRadius: 20,
          border: `1px solid ${C.border}`,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <VoltaraLogo height={40} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Voltara Operations</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Enter the access password to continue.</div>
        </div>

        <div>
          <label
            htmlFor="voltara-password-input"
            style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: C.slate,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            id="voltara-password-input"
            type="password"
            autoComplete="current-password"
            value={entry}
            onChange={(e) => { setEntry(e.target.value); setError(false); }}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${error ? '#C0321A' : C.border}`,
              fontFamily: 'Figtree',
              fontSize: 14,
              outline: 'none',
              background: C.white,
            }}
          />
          {error && (
            <div style={{ fontSize: 11, color: '#C0321A', fontWeight: 600, marginTop: 6 }}>
              Wrong password. Try again.
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!entry}
          style={{
            padding: '11px 18px',
            borderRadius: 10,
            border: 'none',
            background: entry ? C.green : C.slate,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: entry ? 'pointer' : 'not-allowed',
          }}
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
