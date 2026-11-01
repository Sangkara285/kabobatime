'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Baris yang bisa digeser: sentuhan (HP), drag mouse, tombol panah (desktop), dan keyboard (Tab antar item).
export default function HScroll({ children, label, className = '', innerClass = '', scrollerRef }) {
  const local = useRef(null);
  const ref = scrollerRef || local;
  const [can, setCan] = useState({ l: false, r: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const l = el.scrollLeft > 4, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setCan((prev) => (prev.l === l && prev.r === r ? prev : { l, r }));
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) { ro.observe(el); if (el.firstElementChild) ro.observe(el.firstElementChild); }
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); el.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [measure, ref, children]);

  function onMouseDown(e) {
    const el = ref.current;
    if (!el || e.button !== 0 || el.scrollWidth <= el.clientWidth) return;
    const start = { x: e.clientX, left: el.scrollLeft, moved: false };
    const move = (ev) => {
      const dx = ev.clientX - start.x;
      if (!start.moved && Math.abs(dx) > 5) start.moved = true;
      if (start.moved) el.scrollLeft = start.left - dx;
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (start.moved) {
        // Hindari klik tak sengaja pada item setelah menggeser.
        const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
        el.addEventListener('click', stop, true);
        setTimeout(() => el.removeEventListener('click', stop, true), 60);
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  const by = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.8), behavior: 'smooth' });
  };
  const arrow = 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card text-lg shadow-md ring-1 ring-line hover:bg-brand-soft md:grid';

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        onMouseDown={onMouseDown}
        onDragStart={(e) => e.preventDefault()}
        className={`flex select-none overflow-x-auto overscroll-x-contain [scrollbar-width:none] md:cursor-grab [&::-webkit-scrollbar]:hidden ${innerClass}`}
      >
        {children}
      </div>
      {can.l && <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-paper to-transparent" />}
      {can.r && <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-paper to-transparent" />}
      {can.l && <button type="button" aria-label="Geser ke kiri" onClick={() => by(-1)} className={`${arrow} left-1`}>‹</button>}
      {can.r && <button type="button" aria-label="Geser ke kanan" onClick={() => by(1)} className={`${arrow} right-1`}>›</button>}
    </div>
  );
}
