import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { supabase } from '@/shared/lib/supabase';

/**
 * Account settings for the signed-in user. Currently just identity + password,
 * but it's the natural home for anything else per-user we add later.
 *
 * Changing a password re-authenticates first. Supabase only requires a valid
 * session to call updateUser, which means an unattended open tab would be
 * enough to change the password and lock the real owner out. Asking for the
 * current password closes that.
 */

const MIN_LENGTH = 10;

interface Props {
  email: string;
  onClose: () => void;
  onSignOut: () => void;
}

export function ProfileModal({ email, onClose, onSignOut }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const unchanged = next.length > 0 && next === current;
  const canSubmit =
    !!current && next.length >= MIN_LENGTH && next === confirm && !unchanged && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setDone(false);

    // Re-authenticate before allowing the change.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauthErr) {
      setError('Current password is incorrect.');
      setCurrent('');
      setBusy(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    if (updateErr) {
      setError(updateErr.message);
      setBusy(false);
      return;
    }

    setCurrent('');
    setNext('');
    setConfirm('');
    setDone(true);
    setBusy(false);
  };

  return (
    <Modal title="Account" subtitle={email} onClose={onClose} width={520}>
      {/* Identity */}
      <div style={identityCard}>
        <div style={avatar}>{(email || '?').charAt(0).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {email}
          </div>
          <div style={{ fontSize: 11, color: C.slate }}>Voltara Ops · full access</div>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={sectionLabel}>Change password</div>

        <div>
          <label htmlFor="pw-current" style={label}>Current password</label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setError(null); setDone(false); }}
            style={input(false)}
          />
        </div>

        <div>
          <label htmlFor="pw-new" style={label}>New password</label>
          <input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => { setNext(e.target.value); setError(null); setDone(false); }}
            style={input(tooShort || unchanged)}
          />
          <div style={{ fontSize: 11, color: tooShort || unchanged ? C.error : C.slate, fontWeight: 600, marginTop: 6 }}>
            {unchanged
              ? 'New password must be different from the current one.'
              : tooShort
                ? `At least ${MIN_LENGTH} characters.`
                : `Use at least ${MIN_LENGTH} characters.`}
          </div>
        </div>

        <div>
          <label htmlFor="pw-confirm" style={label}>Confirm new password</label>
          <input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); setDone(false); }}
            style={input(mismatch)}
          />
          {mismatch && (
            <div style={{ fontSize: 11, color: C.error, fontWeight: 600, marginTop: 6 }}>
              Passwords do not match.
            </div>
          )}
        </div>

        {error && <div style={banner(C.errorBg, C.error)}>{error}</div>}
        {done && <div style={banner(C.honeydew, C.green)}>Password updated. Use it next time you sign in.</div>}

        {/* Button order per CLAUDE.md §11: destructive left, cancel pushed
            right, primary action rightmost. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: `1px solid ${C.divider}`, paddingTop: 16 }}>
          <button type="button" onClick={onSignOut} style={ghostBtn}>Sign out</button>
          <button type="button" onClick={onClose} style={{ ...ghostBtn, marginLeft: 'auto', color: C.slate }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: 'none',
              background: canSubmit ? C.green : C.slate,
              color: C.white,
              fontFamily: 'Figtree',
              fontSize: 13,
              fontWeight: 700,
              cursor: busy ? 'wait' : canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const identityCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: C.seasalt,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '14px 16px',
};

const avatar: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  background: C.green,
  color: C.yellow,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: 15,
  flexShrink: 0,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
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

const banner = (bg: string, color: string): React.CSSProperties => ({
  background: bg,
  color,
  fontSize: 12,
  fontWeight: 600,
  padding: '10px 12px',
  borderRadius: 8,
});

const ghostBtn: React.CSSProperties = {
  padding: '9px 14px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  background: C.white,
  fontFamily: 'Figtree',
  fontSize: 13,
  fontWeight: 700,
  color: C.ink,
  cursor: 'pointer',
};
