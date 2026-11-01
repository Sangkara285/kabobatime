'use client';
import { useCallback, useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { rp } from '@/lib/format';

export default function CourierApp() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/courier/orders', { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || 'Tugas tidak bisa dimuat.'); return; }
    setError(''); setOrders(d.orders || []);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  async function complete(code) {
    setBusy(code);
    const r = await fetch(`/api/courier/orders/${code}`, { method: 'PATCH' });
    const d = await r.json().catch(() => ({}));
    setBusy('');
    if (!r.ok) { setError(d.error || 'Status belum tersimpan.'); return; }
    setOrders((current) => current.filter((o) => o.code !== code));
  }
  return <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-24"><header className="flex items-center justify-between"><div><p className="text-sm text-ink-2">Kaboba Time</p><h1 className="text-2xl font-extrabold">Tugas antar</h1></div><ThemeToggle /></header>{error && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">{error}</p>}{!orders.length && !error && <div className="card p-6 text-center text-ink-2">Belum ada pesanan siap diantar.</div>}{orders.map((o) => <article key={o.code} className="card space-y-3 p-5"><div className="flex justify-between gap-3"><h2 className="font-mono text-xl font-bold">{o.code}</h2><span className="rounded-full bg-leaf-soft px-3 py-1 text-sm font-bold text-leaf">Siap diantar</span></div><p className="font-semibold">{o.name}</p><p className="text-ink-2">{o.address}</p>{o.distanceKm != null && <p className="text-sm text-ink-2">{String(o.distanceKm).replace('.', ',')} km</p>}<p className="font-bold">Total {rp(o.total)}</p><div className="flex gap-2"><a className="btn btn-ghost flex-1" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`} target="_blank" rel="noopener noreferrer">Buka peta</a><button className="btn flex-1" disabled={busy === o.code} onClick={() => complete(o.code)}>{busy === o.code ? 'Menyimpan…' : 'Pesanan diterima'}</button></div></article>)}</main>;
}
