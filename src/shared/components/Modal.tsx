import type { ReactNode } from 'react';
import { C } from '@/shared/tokens';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function Modal({ title, subtitle, onClose, children, width = 640 }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.32)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: 20,
          width,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: C.divider,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 16,
              color: C.slate,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
