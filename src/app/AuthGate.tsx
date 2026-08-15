import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { C } from '@/shared/tokens';
import { supabase } from '@/shared/lib/supabase';
import { VoltaraLogo } from '@/shared/components/VoltaraLogo';

/**
 * Real authentication gate. Replaces the old frontend-only PasswordGate, which
 * compared against a hardcoded string in the bundle and therefore protected
 * nothing — the anon key shipped alongside it granted full read/write on every
 * table regardless of whether anyone got past the form.
 *
 * This gate issues a genuine Supabase session, and RLS policies are scoped to
 * the `authenticated` role, so the database itself now enforces access. The
 * login screen and the policies are two halves of one control: neither works
 * without the other.
 */

interface AuthValue {
  session: Session | null;
  email: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  session: null,
  email: '',
  signOut: async () => {},
});

/** Session + sign-out for the shell. Only meaningful inside <AuthGate>. */
export function useAuth(): AuthValue {
  return useContext(AuthContext);
}

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  // Distinct from "logged out" — supabase reads the persisted session from
  // localStorage asynchronously, so rendering the form immediately would flash
  // a login screen at an already-authenticated user on every refresh.
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!checking && !session) {
      document.getElementById('voltara-email-input')?.focus();
    }
  }, [checking, session]);

  const value: AuthValue = {
    session,
    email: session?.user?.email ?? '',
    signOut: async () => { await supabase.auth.signOut(); },
  };

  if (checking) {
    return (
      <div style={shell}>
        <div style={{ color: C.slate, fontSize: 13, fontWeight: 600 }}>Loading…</div>
      </div>
    );
  }

  if (session) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      // Supabase returns the same message for unknown email and wrong
      // password, which is the behaviour we want — don't help an attacker
      // enumerate valid addresses by distinguishing them.
      setError('Those details did not match an account.');
      setPassword('');
    }
    setBusy(false);
  };

  return (
    <div style={shell}>
      <form onSubmit={submit} style={card}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <VoltaraLogo height={40} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>Voltara Operations</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Sign in to continue.</div>
        </div>

        <div>
          <label htmlFor="voltara-email-input" style={label}>Email</label>
          <input
            id="voltara-email-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            style={input(!!error)}
          />
        </div>

        <div>
          <label htmlFor="voltara-password-input" style={label}>Password</label>
          <input
            id="voltara-password-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            style={input(!!error)}
          />
          {error && (
            <div style={{ fontSize: 11, color: C.error, fontWeight: 600, marginTop: 6 }}>
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!email || !password || busy}
          style={{
            padding: '11px 18px',
            borderRadius: 10,
            border: 'none',
            background: email && password && !busy ? C.green : C.slate,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: busy ? 'wait' : email && password ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: C.seasalt,
  padding: 20,
  fontFamily: 'Figtree',
};

const card: React.CSSProperties = {
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
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};

const input = (invalid: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${invalid ? C.error : C.border}`,
  fontFamily: 'Figtree',
  fontSize: 14,
  outline: 'none',
  background: C.white,
});
