'use client';
import { useEffect, useRef, useState } from 'react';
import ProductImage from './ProductImage';
import { rp } from '@/lib/format';

const INTERVAL = 4000;

// Carousel foto menu di hero. Berganti tiap 4 detik, jeda saat disentuh/di-hover/di-fokus,
// berhenti saat tab tidak terlihat, dan tidak berganti otomatis bila pengguna meminta gerak minimal.
export default function HeroCarousel({ items, onOpen }) {
  const [i, setI] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduce, setReduce] = useState(false);
  const touchTimer = useRef(null);
  const n = items.length;
  const idx = n ? i % n : 0;
  const cur = items[idx];
  const paused = hovered || focused || touchPaused;

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => setReduce(m.matches);
    motion();
    m.addEventListener('change', motion);
    const vis = () => setHidden(document.hidden);
    vis();
    document.addEventListener('visibilitychange', vis);
    return () => {
      m.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  useEffect(() => () => clearTimeout(touchTimer.current), []);

  useEffect(() => {
    if (n < 2 || paused || hidden || reduce) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % n), INTERVAL);
    return () => clearInterval(t);
  }, [n, paused, hidden, reduce]);

  // Muat dulu foto berikutnya agar pergantian tidak berkedip.
  useEffect(() => {
    if (n < 2) return;
    const nxt = items[(idx + 1) % n];
    if (nxt?.image) { const im = new Image(); im.src = nxt.image; }
  }, [idx, n, items]);

  if (!n) return null;
  const go = (d) => setI((x) => (x + d + n) % n);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Menu pilihan"
      className="relative mx-auto w-full max-w-sm md:max-w-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onTouchStart={() => {
        clearTimeout(touchTimer.current);
        setTouchPaused(true);
      }}
      onTouchEnd={() => {
        clearTimeout(touchTimer.current);
        touchTimer.current = setTimeout(() => setTouchPaused(false), 3000);
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-4 ring-white/10 md:aspect-[5/4]">
        {items.map((p, k) => (
          <div key={p.id} aria-hidden={k !== idx} className={`absolute inset-0 transition-opacity duration-500 ${k === idx ? 'opacity-100' : 'opacity-0'}`}>
            <ProductImage src={p.image} name={p.name} className="h-full w-full" />
          </div>
        ))}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-5">
          <div className="min-w-0" aria-live="polite">
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-white/85">Menu pilihan</p>
            <p className="font-display truncate text-xl font-extrabold leading-tight sm:text-2xl">{cur.name}</p>
            <p className="num text-lg font-bold">{rp(cur.price)}</p>
          </div>
          <button type="button" onClick={() => onOpen(cur)} className="shrink-0 rounded-full bg-brand px-5 py-2.5 font-bold text-white shadow-lg hover:bg-brand-dark">
            Pesan
          </button>
        </div>

        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Menu sebelumnya" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Menu berikutnya" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-xl text-white hover:bg-black/70">›</button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="mt-3 flex justify-center gap-1" role="group" aria-label="Pilih menu">
          {items.map((p, k) => (
            <button key={p.id} type="button" onClick={() => setI(k)} aria-label={`Tampilkan ${p.name}`} aria-current={k === idx ? 'true' : undefined} className="grid h-7 w-7 place-items-center">
              <span className={`h-2 rounded-full bg-white transition-all ${k === idx ? 'w-6 opacity-100' : 'w-2 opacity-50'}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
