'use client';
import { useEffect, useRef, useState } from 'react';

// Foto produk dengan cadangan: tidak pernah menampilkan ikon gambar rusak atau spinner yang tak berhenti.
export default function ProductImage({ src, name = '', className = '', sold = false }) {
  const ref = useRef(null);
  const [state, setState] = useState(src ? 'loading' : 'error');

  useEffect(() => {
    if (!src) { setState('error'); return; }
    setState('loading');
    const im = ref.current;
    // Gambar bisa sudah selesai dimuat sebelum React aktif, sehingga onLoad terlewat.
    if (im && im.complete) setState(im.naturalWidth > 0 ? 'ok' : 'error');
    const t = setTimeout(() => setState((s) => (s === 'loading' ? 'error' : s)), 8000);
    return () => clearTimeout(t);
  }, [src]);

  return (
    <div className={`relative overflow-hidden bg-brand-soft ${className}`}>
      {src && state !== 'error' && (
        <img
          ref={ref}
          src={src}
          alt=""
          decoding="async"
          draggable={false}
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${state === 'ok' ? 'opacity-100' : 'opacity-0'} ${sold ? 'grayscale' : ''}`}
        />
      )}
      {state === 'loading' && <div aria-hidden className="absolute inset-0 animate-pulse bg-brand/10" />}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center text-brand-dark">
          <svg viewBox="0 0 64 64" className="h-1/3 max-h-12 w-auto opacity-70" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 26c0-5 4-9 9-9h22c5 0 9 4 9 9v4H12z" />
            <path d="M14 30l4 18c.6 3 3 5 6 5h16c3 0 5.4-2 6-5l4-18" />
            <path d="M24 38v6M32 38v8M40 38v6" />
          </svg>
          <span className="line-clamp-2 text-[11px] font-semibold leading-tight opacity-80">{name}</span>
        </div>
      )}
    </div>
  );
}
