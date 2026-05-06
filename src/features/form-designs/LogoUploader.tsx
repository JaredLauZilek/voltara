import { useRef, useState } from 'react';
import { C } from '@/shared/tokens';

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const MAX_BYTES = 1_000_000; // 1MB pre-resize
const MAX_DIMENSION = 512;

export function LogoUploader({ value, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('File must be an image (PNG / JPG / SVG).');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 1MB.');
      return;
    }
    if (file.type === 'image/svg+xml') {
      const text = await file.text();
      onChange(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('Could not process image.');
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      onChange(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setError('Could not load image.');
    img.src = URL.createObjectURL(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInput.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? C.green : C.border}`,
          background: isDragging ? C.honeydew : C.seasalt,
          borderRadius: 12,
          padding: 20,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'background 120ms, border-color 120ms',
        }}
      >
        {value ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <img src={value} alt="Logo" style={{ maxHeight: 80, maxWidth: '100%', objectFit: 'contain' }} />
            <div style={{ fontSize: 12, color: C.slate }}>
              Click or drop a new image to replace
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>Drop logo here or click to browse</div>
            <div style={{ fontSize: 11, color: C.slate }}>PNG, JPG, or SVG · up to 1MB · auto-resized to 512px</div>
          </div>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {value && (
        <button
          onClick={() => { onChange(null); setError(null); }}
          style={{
            marginTop: 8,
            border: 'none',
            background: 'transparent',
            color: '#C0321A',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Figtree',
            padding: 0,
          }}
        >
          Remove logo
        </button>
      )}
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#C0321A', fontWeight: 600 }}>{error}</div>
      )}
    </div>
  );
}
