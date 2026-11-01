'use client';
import { useEffect, useState } from 'react';

// Dua tombol mengambang di kanan bawah, ukuran dan sumbu sama:
// atas = dashboard penjual (hanya untuk penjual yang sudah masuk), bawah = kembali ke atas.
export default function FloatingDock({ raised = false, showDashboard = true }) {
  const [top, setTop] = useState(false);
  const [seller, setSeller] = useState({ loggedIn: false, newOrders: 0 });

  useEffect(() => {
    const on = () => setTop(window.scrollY > 400);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useEffect(() => {
    if (!showDashboard) return undefined;
    let alive = true;
    const load = () => fetch('/api/seller/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setSeller(d); })
      .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [showDashboard]);

  const showSeller = showDashboard && seller.loggedIn;
  if (!top && !showSeller) return null;

  const btn = 'grid h-12 w-12 place-items-center rounded-full shadow-lg ring-1 ring-inset transition active:scale-95';
  return (
    <div
      className={`fixed right-4 z-40 flex flex-col items-center gap-3 ${raised ? 'bottom-24 lg:bottom-4' : 'bottom-4'}`}
      style={{ right: 'max(16px, env(safe-area-inset-right))' }}
    >
      {showSeller && (
        <a href="/penjual#pesanan" aria-label="Ke dashboard penjual" title="Dashboard penjual" className={`${btn} relative bg-brand text-white ring-brand-dark hover:bg-brand-dark`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          {seller.newOrders > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-warn px-1 text-[11px] font-bold text-white ring-2 ring-paper">
              {seller.newOrders}
            </span>
          )}
        </a>
      )}
      {top && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Kembali ke atas" title="Ke atas" className={`${btn} bg-card text-ink ring-line hover:bg-brand-soft`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
