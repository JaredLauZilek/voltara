import { useState } from 'react';
import { C } from '@/shared/tokens';
import { Modal } from '@/shared/components/Modal';
import { CUSTOMER_TYPES, CUSTOMER_STATUSES, LEAD_SOURCES } from './types';
import type { Customer, CustomerInsert } from './types';

interface Props {
  customer: Customer | null;
  onClose: () => void;
  onSave: (row: CustomerInsert) => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
  saveError?: string | null;
}

const COUNTRY_CODES = [
  { dial: '+60', label: 'Malaysia' },
  { dial: '+65', label: 'Singapore' },
  { dial: '+62', label: 'Indonesia' },
  { dial: '+66', label: 'Thailand' },
  { dial: '+84', label: 'Vietnam' },
  { dial: '+63', label: 'Philippines' },
  { dial: '+44', label: 'United Kingdom' },
  { dial: '+61', label: 'Australia' },
  { dial: '+91', label: 'India' },
  { dial: '+86', label: 'China' },
  { dial: '+81', label: 'Japan' },
  { dial: '+82', label: 'South Korea' },
  { dial: '+1',  label: 'United States' },
];

const parsePhone = (phone: string | null): { code: string; local: string } => {
  if (!phone) return { code: '+60', local: '' };
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const { dial } of sorted) {
    if (phone.startsWith(dial)) return { code: dial, local: phone.slice(dial.length) };
  }
  return { code: '+60', local: phone };
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
  background: C.white,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};

export function CustomerModal({ customer, onClose, onSave, onDelete, isSaving, saveError }: Props) {
  const isNew = !customer;
  const [form, setForm] = useState<CustomerInsert>(
    customer ?? {
      id: `CUST-${String(Date.now()).slice(-4)}`,
      name: '',
      email: null,
      phone: null,
      address: null,
      attention_to: null,
      lead_source: null,
      type: 'Residential',
      status: 'Active',
      joined: new Date().toISOString().slice(0, 10),
      notes: null,
    }
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const { code: initCode, local: initLocal } = parsePhone(customer?.phone ?? null);
  const [phoneCode, setPhoneCode] = useState(initCode);
  const [phoneLocal, setPhoneLocal] = useState(initLocal);

  const handlePhoneLocalChange = (val: string) => {
    const digits = val.replace(/[^\d]/g, '');
    setPhoneLocal(digits);
    setPhoneError(digits.length > 0 && digits.length < 6 ? 'Enter a valid phone number' : '');
  };

  const validateEmail = (val: string) => {
    if (!val) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? '' : 'Enter a valid email address';
  };

  const handleEmailChange = (val: string) => {
    setForm((f) => ({ ...f, email: val || null }));
    setEmailError(validateEmail(val));
  };

  const [nameError, setNameError] = useState('');

  const handleSave = () => {
    if (!form.name.trim()) {
      setNameError('Name is required.');
      return;
    }
    if (form.email && emailError) return;
    if (phoneError) return;
    const phone = phoneLocal ? phoneCode + phoneLocal : null;
    onSave({ ...form, name: form.name.trim(), phone });
  };

  const canSave = !!form.name.trim() && !(form.email && emailError) && !phoneError && !isSaving;

  return (
    <Modal title={isNew ? 'New Customer' : form.name} subtitle={!isNew ? form.id : undefined} onClose={onClose}>
      {/* Type */}
      <div>
        <label style={labelStyle}>Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CUSTOMER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                border: `2px solid ${form.type === t ? C.green : C.border}`,
                background: form.type === t ? C.honeydew : C.white,
                color: form.type === t ? C.green : C.slate,
                fontFamily: 'Figtree',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Name */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Name / Company</label>
          <input
            value={form.name}
            onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); if (nameError) setNameError(''); }}
            style={{ ...inputStyle, borderColor: nameError ? C.error : C.border }}
          />
          {nameError && (
            <div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>{nameError}</div>
          )}
        </div>

        {/* Attention To */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Attention To</label>
          <input
            value={form.attention_to ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, attention_to: e.target.value || null }))}
            placeholder="Contact person name"
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => handleEmailChange(e.target.value)}
            style={{ ...inputStyle, borderColor: emailError ? C.error : C.border }}
          />
          {emailError && (
            <div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>{emailError}</div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label style={labelStyle}>Phone</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              style={{ ...inputStyle, width: 'auto', flexShrink: 0, paddingRight: 8 }}
            >
              {COUNTRY_CODES.map(({ dial, label }) => (
                <option key={dial} value={dial}>{dial} {label}</option>
              ))}
            </select>
            <input
              value={phoneLocal}
              onChange={(e) => handlePhoneLocalChange(e.target.value)}
              placeholder="123456789"
              style={{ ...inputStyle, borderColor: phoneError ? C.error : C.border }}
            />
          </div>
          {phoneError && (
            <div style={{ fontSize: 11, color: C.error, marginTop: 4 }}>{phoneError}</div>
          )}
        </div>

        {/* Address */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Address</label>
          <textarea
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value || null }))}
            rows={3}
            placeholder="Press Enter for a new line"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'Figtree' }}
          />
        </div>

        {/* Lead Source */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Lead Source</label>
          <select
            value={form.lead_source ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, lead_source: (e.target.value || null) as typeof form.lead_source }))
            }
            style={inputStyle}
          >
            <option value="">— Select source —</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Customer['status'] }))}
            style={inputStyle}
          >
            {CUSTOMER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Joined */}
        <div>
          <label style={labelStyle}>Joined</label>
          <input
            type="date"
            value={form.joined ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, joined: e.target.value || null }))}
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div style={{ gridColumn: '1/-1' }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div style={{ fontSize: 12, color: C.error, fontWeight: 600, padding: '10px 12px', background: C.errorBg, borderRadius: 8 }}>
          {saveError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!isNew && onDelete && (
          confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.error, fontWeight: 600 }}>
                This is permanent and cannot be undone.
              </span>
              <button
                onClick={() => onDelete(customer.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: C.error,
                  color: C.white,
                  fontFamily: 'Figtree',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.slate,
                  fontFamily: 'Figtree',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1px solid #FDEAEA',
                background: 'transparent',
                color: C.error,
                fontFamily: 'Figtree',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          )
        )}
        <button
          onClick={onClose}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            background: 'transparent',
            color: C.slate,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: canSave ? C.green : C.slate,
            color: C.white,
            fontFamily: 'Figtree',
            fontSize: 13,
            fontWeight: 700,
            cursor: canSave ? 'pointer' : (isSaving ? 'wait' : 'not-allowed'),
            opacity: canSave ? 1 : 0.6,
          }}
        >
          {isSaving ? 'Saving…' : (isNew ? 'Create' : 'Save Changes')}
        </button>
      </div>
    </Modal>
  );
}
