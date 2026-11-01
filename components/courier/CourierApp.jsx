'use client';
import { useCallback, useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { rp } from '@/lib/format';
import { useRouter } from 'next/navigation';

function clock(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '.');
}

export default function CourierApp() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(async () => {
    const r = await fetch('/api/kurir/orders', { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || 'Tugas tidak bisa dimuat.'); return; }
    setError(''); setOrders(d.orders || []);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  async function complete(code) {
    setBusy(code);
    const r = await fetch(`/api/kurir/orders/${code}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'selesai' }) });
    const d = await r.json().catch(() => ({}));
    setBusy('');
    if (!r.ok) { setError(d.error || 'Status belum tersimpan.'); return; }
    setOrders((current) => current.filter((o) => o.code !== code));
  }
  async function logout() { await fetch('/api/kurir/login', { method: 'DELETE' }); router.refresh(); }
  return <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-24"><header className="flex items-center justify-between"><div><p className="text-sm text-ink-2">Kaboba Time</p><h1 className="text-2xl font-extrabold">Tugas antar</h1></div><div className="flex gap-2"><ThemeToggle /><button className="btn btn-ghost btn-sm" onClick={logout}>Keluar</button></div></header>{error && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">{error}</p>}{!orders.length && !error && <div className="card p-6 text-center text-ink-2">Belum ada pesanan perlu diantar.</div>}{orders.map((o) => <article key={o.code} className="card space-y-3 p-5"><div className="flex justify-between gap-3"><h2 className="font-mono text-xl font-bold">{o.code}</h2><span className="rounded-full bg-leaf-soft px-3 py-1 text-sm font-bold text-leaf">{o.status === 'siap' ? 'Siap diantar' : 'Sedang diproses'}</span></div><p className="text-sm text-ink-2">Diterima pukul {clock(o.acceptedAt)}</p><p className="text-sm font-semibold">{o.readyAt ? `Siap diantar pukul ${clock(o.readyAt)}` : 'Sedang disiapkan'}</p><p className="font-semibold">{o.name}</p><a className="block font-semibold underline" href={`tel:${o.phone}`}>{o.phone}</a><p className="text-ink-2">{o.address}</p>{o.mapsUrl && <a className="inline-flex min-h-11 items-center font-semibold text-brand-dark underline" href={o.mapsUrl} target="_blank" rel="noopener noreferrer">Buka Google Maps</a>}{o.distanceKm != null && <p className="text-sm text-ink-2">Jarak {String(o.distanceKm).replace('.', ',')} km</p>}{o.payment === 'Tunai' && (o.cashAmount ? <p className="rounded-xl bg-brand-soft p-3 font-bold">Bawa kembalian {rp(Math.max(0, o.cashAmount - o.total))}</p> : <p className="rounded-xl bg-leaf-soft p-3 font-bold text-leaf">Uang pas</p>)}<p className="font-bold">Total {rp(o.total)} · {o.payment}</p>{o.payment === 'QRIS' && o.paymentStatus !== 'terverifikasi' && <p className="rounded-xl bg-warn-soft p-3 text-sm font-semibold text-warn-text">Bayar dulu via QRIS, cek dengan penjual.</p>}{o.note && <p className="rounded-xl bg-paper p-3 text-sm">Catatan: {o.note}</p>}<button className="btn min-h-12 w-full" disabled={busy === o.code} onClick={() => complete(o.code)}>{busy === o.code ? 'Menyimpan…' : 'Tandai selesai'}</button></article>)}</main>;
}
