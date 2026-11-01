'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { rp, statusLabel } from '@/lib/format';
import ThemeToggle from '@/components/ThemeToggle';
import FloatingDock from '@/components/FloatingDock';
import { api, FILTERS, NEXT, BADGE, PAYBADGE, PAYTEXT, when, chatUrl } from './shared';
import { ProductsAdmin, CategoriesAdmin, SettingsAdmin } from './SellerAdmin';

const TABS = [['pesanan', 'Pesanan'], ['produk', 'Produk'], ['kategori', 'Kategori'], ['pengaturan', 'Pengaturan']];
const RANK = { baru: 0, diproses: 1, siap: 2, selesai: 3, batal: 4 };
const gutter = { paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' };

export default function SellerApp() {
  const router = useRouter();
  const [tab, setTab] = useState('pesanan');
  const [toast, setToast] = useState('');
  const tt = useRef();
  const notify = useCallback((t) => { setToast(t); clearTimeout(tt.current); tt.current = setTimeout(() => setToast(''), 2600); }, []);

  // Tab terakhir diingat lewat hash di URL, misalnya /penjual#produk.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some(([k]) => k === h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const choose = (k) => { setTab(k); window.history.replaceState(null, '', '#' + k); };

  async function logout() {
    await api('/api/seller/login', 'DELETE');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl pb-24" style={gutter}>
      <header className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="" className="h-10 w-10 rounded-full" />
          <h1 className="text-2xl font-extrabold">Dashboard penjual</h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" className="btn btn-ghost btn-sm">Lihat toko</a>
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm" onClick={logout}>Keluar</button>
        </div>
      </header>

      <nav aria-label="Menu penjual" className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => choose(k)} aria-current={tab === k ? 'page' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 font-semibold ring-1 ring-inset ${tab === k ? 'bg-ink text-paper ring-ink' : 'bg-card text-ink ring-line hover:bg-brand-soft'}`}>{l}</button>
        ))}
      </nav>

      {tab === 'pesanan' && <OrdersTab notify={notify} />}
      {tab === 'produk' && <ProductsAdmin notify={notify} />}
      {tab === 'kategori' && <CategoriesAdmin notify={notify} />}
      {tab === 'pengaturan' && <SettingsAdmin notify={notify} />}

      <FloatingDock showDashboard={false} />
      {toast && <div role="status" className="fixed left-1/2 z-[70] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))' }}>{toast}</div>}
    </div>
  );
}

function OrdersTab({ notify }) {
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('semua');
  const [q, setQ] = useState('');
  const [soundOn, setSoundOn] = useState(false);
  const [confirmFor, setConfirmFor] = useState(null);
  const [undo, setUndo] = useState(null); // { code, status } selama 8 detik setelah pembatalan
  const [updated, setUpdated] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [offline, setOffline] = useState(false);
  const seen = useRef(null);
  const ctx = useRef(null);
  const soundRef = useRef(false);

  useEffect(() => {
    try { const v = localStorage.getItem('kbt_sound') === '1'; setSoundOn(v); soundRef.current = v; } catch { /* abaikan */ }
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Bunyi notifikasi sederhana. Browser hanya mengizinkan suara setelah ada klik, jadi suara diaktifkan dari tombol.
  const beep = useCallback(() => {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      if (!ctx.current) ctx.current = new C();
      const c = ctx.current;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.6);
    } catch { /* perangkat tanpa audio */ }
  }, []);

  const load = useCallback(async () => {
    const r = await api('/api/seller/orders');
    if (!r.ok) { setOffline(true); return; }
    setOffline(false);
    const list = r.data.orders || [];
    setOrders(list);
    setUpdated(Date.now());
    const baru = list.filter((x) => x.status === 'baru').length;
    if (seen.current !== null && baru > seen.current && soundRef.current) beep();
    seen.current = baru;
    document.title = (baru ? `(${baru}) ` : '') + 'Dashboard penjual · Kaboba Time';
  }, [beep]);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (!undo) return undefined; const t = setTimeout(() => setUndo(null), 8000); return () => clearTimeout(t); }, [undo]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    try { localStorage.setItem('kbt_sound', next ? '1' : '0'); } catch { /* abaikan */ }
    if (next) beep();
  }

  async function change(o, body, msg) {
    const prev = o.status;
    setOrders((os) => os.map((x) => (x.code === o.code ? { ...x, status: body.status ?? x.status, paymentStatus: body.payment ?? x.paymentStatus } : x)));
    const r = await api(`/api/seller/orders/${o.code}`, 'PATCH', body);
    if (!r.ok) { notify(r.data.error || 'Gagal menyimpan perubahan.'); load(); return; }
    if (msg) notify(msg);
    if (body.status === 'batal') setUndo({ code: o.code, status: prev });
    load();
  }

  if (!orders) return <p className="text-ink-2">Memuat pesanan…</p>;

  const cnt = (k) => (k === 'semua' ? orders.length : orders.filter((o) => o.status === k).length);
  const s = q.trim().toLowerCase();
  const newCount = orders.filter((o) => o.status === 'baru').length;
  let list = orders.filter((o) => (filter === 'semua' || o.status === filter) && (!s || o.code.toLowerCase().includes(s) || o.name.toLowerCase().includes(s)));
  if (filter === 'semua') list = list.slice().sort((a, b) => RANK[a.status] - RANK[b.status]);
  const secs = updated ? Math.max(0, Math.round((now - updated) / 1000)) : null;

  return (
    <div className="space-y-4">
      {offline && <div role="alert" className="rounded-2xl bg-warn-soft p-3 text-sm font-semibold text-warn-text">Koneksi ke server terputus. Daftar akan dimuat ulang otomatis.</div>}

      {newCount > 0 && filter !== 'baru' && (
        <button type="button" onClick={() => setFilter('baru')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-brand p-4 text-left font-bold text-white shadow-md hover:bg-brand-dark">
          <span>{newCount} pesanan baru menunggu</span><span aria-hidden>Lihat →</span>
        </button>
      )}

      {undo && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink p-3 text-paper">
          <span className="font-semibold">Pesanan {undo.code} dibatalkan.</span>
          <button type="button" className="rounded-xl bg-paper px-3 py-1.5 font-bold text-ink" onClick={() => { const o = orders.find((x) => x.code === undo.code); setUndo(null); if (o) change(o, { status: undo.status }, 'Pembatalan dibatalkan'); }}>Urungkan</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {FILTERS.map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ring-inset ${filter === k ? 'bg-ink text-paper ring-ink' : 'bg-card text-ink ring-line'}`}>{l}<b className="num opacity-80">{cnt(k)}</b></button>
          ))}
        </div>
        <label className="sr-only" htmlFor="cari">Cari kode atau nama</label>
        <input id="cari" className="field max-w-xs" placeholder="Cari kode atau nama" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" onClick={toggleSound} aria-pressed={soundOn} className="btn btn-ghost btn-sm">{soundOn ? 'Suara aktif' : 'Aktifkan suara'}</button>
        <span className="text-sm text-ink-2" aria-live="polite">{secs !== null ? `Diperbarui ${secs} detik lalu` : ''}</span>
      </div>

      {list.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-8 text-center text-ink-2">{orders.length ? 'Tidak ada pesanan yang cocok.' : 'Belum ada pesanan masuk. Daftar ini diperbarui otomatis.'}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => {
            const nx = NEXT[o.status];
            const nxLabel = nx && (nx[1] || (o.mode === 'antar' ? 'Tandai diantar' : 'Siap diambil'));
            const hasPay = o.payment !== 'Tunai';
            return (
              <article key={o.code} className={`card flex min-w-0 flex-col gap-3 p-4 ${o.status === 'baru' ? 'border-brand ring-2 ring-brand/30' : ''}`}>
                <Link href={`/penjual/pesanan/${o.code}`} className="flex items-start justify-between gap-2 rounded-xl hover:bg-paper/60">
                  <div>
                    <p className="font-mono text-xl font-medium text-brand-dark">{o.code}</p>
                    <p className="text-sm text-ink-2">{when(o.createdAt)}</p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${BADGE[o.status]}`}>{statusLabel(o.status, o.mode)}</span>
                </Link>

                {hasPay && (
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <span className={`rounded-full px-2.5 py-1 ${PAYBADGE[o.paymentStatus] || PAYBADGE.belum}`}>{o.payment}: {PAYTEXT[o.paymentStatus] || ''}</span>
                  </div>
                )}

                <div className="break-words text-sm">
                  <b>{o.name}</b><br />{o.phone} · {o.mode === 'antar' ? 'Antar' : 'Ambil'} · {o.payment}
                  {o.address && <><br />{o.address}</>}
                  {o.mode === 'antar' && o.distanceKm != null && <><br />Jarak {String(o.distanceKm).replace('.', ',')} km{o.lat != null && <> · <a className="font-semibold text-brand-dark underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}>Buka di Maps</a></>}</>}
                </div>

                <ul className="space-y-1 border-t border-dashed border-line pt-2 text-sm">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between gap-2"><span className="min-w-0 break-words">{it.qty}× {it.name}
                      {it.addons.length > 0 && <small className="block text-ink-2">+ {it.addons.map((a) => a.name.replace('Ekstra ', '')).join(', ')}</small>}
                      {it.note && <small className="block text-ink-2">“{it.note}”</small>}</span><span className="num">{rp(it.price * it.qty)}</span></li>
                  ))}
                  {o.fee > 0 && <li className="flex justify-between text-ink-2"><span>Ongkir</span><span className="num">{rp(o.fee)}</span></li>}
                  <li className="flex justify-between font-bold"><span>Total</span><span className="num">{rp(o.total)}</span></li>
                </ul>
                {o.note && <p className="rounded-xl bg-paper p-2.5 text-sm">Catatan: {o.note}</p>}

                <div className="mt-auto flex flex-wrap gap-2">
                  {nx && <button className="btn btn-sm flex-1" onClick={() => change(o, { status: nx[0] }, `${o.code} → ${statusLabel(nx[0], o.mode)}`)}>{nxLabel}</button>}
                  <a className="btn btn-ghost btn-sm flex-1" target="_blank" rel="noopener noreferrer" href={chatUrl(o)}>Chat pembeli</a>
                  {o.status === 'batal'
                    ? <button className="btn btn-ghost btn-sm" onClick={() => change(o, { status: 'baru' }, 'Pesanan diaktifkan lagi')}>Aktifkan lagi</button>
                    : o.status !== 'selesai' && (confirmFor === o.code
                      ? <span className="flex w-full gap-2">
                          <button className="btn btn-sm flex-1 bg-warn hover:bg-warn" onClick={() => { setConfirmFor(null); change(o, { status: 'batal' }, `${o.code} dibatalkan`); }}>Ya, batalkan</button>
                          <button className="btn btn-ghost btn-sm flex-1" onClick={() => setConfirmFor(null)}>Jangan</button>
                        </span>
                      : <button className="btn btn-ghost btn-sm text-warn-text" onClick={() => setConfirmFor(o.code)}>Batalkan</button>)}
                </div>
                <Link href={`/penjual/pesanan/${o.code}`} className="text-sm font-semibold text-brand-dark underline">Lihat detail{hasPay ? ' & bukti pembayaran' : ''}</Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
