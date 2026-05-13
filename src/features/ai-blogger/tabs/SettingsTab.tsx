import { useEffect, useState } from 'react';
import { C } from '@/shared/tokens';
import { useConfig, useUpdateConfig } from '../hooks';
import { POSTING_CADENCES } from '../types';
import type { AIBloggerConfig } from '../types';

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.slate, textTransform: 'uppercase',
  letterSpacing: '0.05em', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${C.border}`, fontFamily: 'Figtree', fontSize: 13, outline: 'none',
};

export function SettingsTab() {
  const { data: config } = useConfig();
  const updateMut = useUpdateConfig();
  const [form, setForm] = useState<AIBloggerConfig | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (config && !form) setForm(config);
  }, [config, form]);

  if (!form) {
    return (
      <div style={{ padding: 28, textAlign: 'center', color: C.slate, fontSize: 13 }}>
        Loading config…
      </div>
    );
  }

  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <div>
        <label style={labelStyle}>Brand voice</label>
        <textarea
          value={form.brand_voice ?? ''}
          onChange={(e) => setForm((f) => f ? { ...f, brand_voice: e.target.value || null } : f)}
          placeholder='e.g. "Professional, slightly technical, Malaysian-English, direct, no hype."'
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label style={labelStyle}>Target audience</label>
        <textarea
          value={form.target_audience ?? ''}
          onChange={(e) => setForm((f) => f ? { ...f, target_audience: e.target.value || null } : f)}
          placeholder='e.g. "Commercial property managers in Klang Valley researching EV charging."'
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Posting cadence</label>
          <select
            value={form.posting_cadence}
            onChange={(e) => setForm((f) => f ? { ...f, posting_cadence: e.target.value as AIBloggerConfig['posting_cadence'] } : f)}
            style={inputStyle}
          >
            {POSTING_CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Next scheduled run</label>
          <input
            type="datetime-local"
            value={form.next_run_at ? form.next_run_at.slice(0, 16) : ''}
            onChange={(e) => setForm((f) => f ? { ...f, next_run_at: e.target.value ? new Date(e.target.value).toISOString() : null } : f)}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>Wix site ID</label>
          <input
            value={form.wix_site_id ?? ''}
            onChange={(e) => setForm((f) => f ? { ...f, wix_site_id: e.target.value || null } : f)}
            placeholder="Find in Wix dashboard URL"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Wix member ID (author)</label>
          <input
            value={form.wix_member_id ?? ''}
            onChange={(e) => setForm((f) => f ? { ...f, wix_member_id: e.target.value || null } : f)}
            placeholder="Member who will be marked as post author"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Default cover image URL</label>
        <input
          value={form.default_cover_image_url ?? ''}
          onChange={(e) => setForm((f) => f ? { ...f, default_cover_image_url: e.target.value || null } : f)}
          placeholder="Used when the agent doesn't generate one"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => updateMut.mutate(
            {
              brand_voice: form.brand_voice,
              target_audience: form.target_audience,
              posting_cadence: form.posting_cadence,
              next_run_at: form.next_run_at,
              wix_site_id: form.wix_site_id,
              wix_member_id: form.wix_member_id,
              default_cover_image_url: form.default_cover_image_url,
            },
            { onSuccess: () => setSavedAt(new Date()) },
          )}
          disabled={updateMut.isPending}
          style={{
            marginLeft: 'auto',
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: updateMut.isPending ? C.slate : C.green,
            color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700,
            cursor: updateMut.isPending ? 'wait' : 'pointer',
          }}
        >
          {updateMut.isPending ? 'Saving…' : 'Save Settings'}
        </button>
        {savedAt && !updateMut.isPending && (
          <span style={{ fontSize: 12, color: C.slate }}>
            Saved at {savedAt.toLocaleTimeString('en-MY', { timeStyle: 'short' })}
          </span>
        )}
      </div>
    </div>
  );
}
