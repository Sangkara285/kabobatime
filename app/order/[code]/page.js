'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { rp, statusLabel } from '@/lib/format';
import BackButton from '@/components/BackButton';
import FloatingDock from '@/components/FloatingDock';
import ThemeToggle from '@/components/ThemeToggle';

const MAX_BYTES = 4 * 1024 * 1024;
const STEPS = ['baru', 'diproses', 'siap', 'selesai'];

export default function OrderPage() {
  const { code } = useParams();
  if (String(code).toLowerCase() === 'cari') return <Lookup />;
  return <Suspense fallback={<Shell><p className="text-ink-2">Memuat pesanan…</p></Shell>}><Ticket code={String(code).toUpperCase()} /></Suspense>;
}

function Shell({ children }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-5 pb-28" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
      <header className="flex items-center justify-between gap-3">
        <a href="/" className="flex items-center gap-2 py-1 font-semibold text-ink">
          <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-full" /> Kaboba Time
        </a>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}

function Lookup() {
  const router = useRouter();
  const [v, setV] = useState('');
  useEffect(() => { try { setV((JSON.parse(localStorage.getItem('kbt_last') || '""')) || ''); } catch { /* abaikan */ } }, []);
  function go(e) {
    e.preventDefault();
    const c = v.trim().toUpperCase();
    if (c) router.push(`/order/${encodeURIComponent(c)}`);
  }
  return (
    <Shell>
      <BackButton href="/" label="Menu" />
      <form onSubmit={go} className="card space-y-4 p-6">
        <h1 className="text-2xl font-extrabold">Lacak pesanan</h1>
        <p className="text-ink-2">Masukkan kode order yang kamu terima setelah memesan, contohnya KBT-0111-ABCD.</p>
        <div>
          <label htmlFor="kode" className="mb-1.5 block font-semibold">Kode order</label>
          <input id="kode" className="field font-mono uppercase" value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" autoFocus />
        </div>
        <button className="btn" disabled={!v.trim()}>Lacak</button>
      </form>
      <FloatingDock />
    </Shell>
  );
}

function Ticket({ code }) {
  const search = useSearchParams();
  const fresh = search.get('baru') === '1';
  const [o, setO] = useState(null);
  const [waLink, setWaLink] = useState('');
  const [err, setErr] = useState('');
  const [at, setAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/orders/${code}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || 'Pesanan tidak ditemukan.'); return; }
      setO(d.order); setWaLink(d.waUrl); setErr(''); setAt(Date.now());
    } catch { setErr('Tidak bisa terhubung. Periksa koneksi lalu coba lagi.'); }
  }, [code]);

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* browser menolak */ }
  }

  if (!o) {
    return (
      <Shell>
        <BackButton href="/" label="Menu" />
        {err ? <div role="alert" className="card p-6 text-warn-text">{err}</div> : <div className="card h-48 animate-pulse p-6" aria-label="Memuat" />}
        <FloatingDock />
      </Shell>
    );
  }

  const cancelled = o.status === 'batal';
  const idx = STEPS.indexOf(o.status);
  const secs = at ? Math.max(0, Math.round((now - at) / 1000)) : null;
  const stepLabel = (s) => (s === 'siap' ? (o.mode === 'antar' ? 'Sedang diantar' : 'Siap diambil') : { baru: 'Pesanan masuk', diproses: 'Sedang disiapkan', selesai: 'Selesai' }[s]);

  return (
    <Shell>
      <BackButton href="/" label="Menu" />

      {fresh && !cancelled && (
        <div role="status" className="rounded-2xl bg-leaf-soft p-4 font-semibold text-leaf">
          Pesananmu sudah masuk. Kirim ke WhatsApp penjual supaya segera diproses.
        </div>
      )}

      <section className="card space-y-3 p-6 text-center">
        <p className="text-sm font-bold uppercase tracking-wider text-ink-2">Kode order</p>
        <p className="select-all break-all font-mono text-3xl font-medium text-brand-dark sm:text-4xl">{code}</p>
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm mx-auto">{copied ? 'Kode tersalin' : 'Salin kode order'}</button>
        <p className="text-sm text-ink-2">Tunjukkan kode ini ke penjual bila diminta. Status di bawah diperbarui otomatis.</p>
      </section>

      {cancelled ? (
        <div role="alert" className="rounded-2xl bg-warn-soft p-4 font-semibold text-warn-text">Pesanan ini dibatalkan. Hubungi penjual lewat WhatsApp bila ada pertanyaan.</div>
      ) : (
        <section className="card p-6" aria-label="Status pesanan">
          <ol className="space-y-4">
            {STEPS.map((s, i) => {
              const done = idx >= i;
              const current = idx === i;
              return (
                <li key={s} className="flex items-center gap-3" aria-current={current ? 'step' : undefined}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-leaf-btn text-white' : 'bg-paper text-ink-2 ring-1 ring-line'}`}>{done ? '✓' : i + 1}</span>
                  <span className={`font-semibold ${done ? 'text-ink' : 'text-ink-2'}`}>{stepLabel(s)}</span>
                  {current && <span className="ml-auto rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-dark">Sekarang</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {o.payment !== 'Tunai' && !cancelled && (
        <PaymentPanel o={o} code={code} reload={load} waLink={waLink} />
      )}

      <section className="card p-6">
        <h2 className="mb-3 text-lg font-bold">Detail pesanan</h2>
        <p className="text-sm text-ink-2">{o.name} · {o.phone}</p>
        <p className="mt-1 text-sm text-ink-2">
          {o.mode === 'antar' ? `Antar ke: ${o.address}` : 'Ambil sendiri di outlet'}
          {o.mode === 'antar' && o.distanceKm != null && ` · ${String(o.distanceKm).replace('.', ',')} km`}
        </p>
        <ul className="mt-4 divide-y divide-line">
          {o.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <b className="block font-semibold">{it.qty}× {it.name}</b>
                {it.addons.length > 0 && <small className="block text-ink-2">+ {it.addons.map((a) => a.name.replace('Ekstra ', '')).join(', ')}</small>}
                {it.note && <small className="block text-ink-2">“{it.note}”</small>}
              </span>
              <span className="num shrink-0">{rp(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-dashed border-line pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="num">{rp(o.subtotal)}</span></div>
          <div className="flex justify-between"><span>Ongkir</span><span className="num">{o.fee ? rp(o.fee) : 'Gratis'}</span></div>
          <div className="flex justify-between pt-1 text-lg font-extrabold"><span>Total</span><span className="num">{rp(o.total)}</span></div>
          <div className="flex justify-between pt-2 text-ink-2"><span>Pembayaran</span><span>{o.payment}</span></div>
          <div className="flex justify-between text-ink-2"><span>Status</span><span>{statusLabel(o.status, o.mode)}</span></div>
        </div>
      </section>

      <div className="flex flex-col gap-3">
        {waLink && (
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="btn btn-wa">Kirim pesanan ke WhatsApp</a>
        )}
        <a href="/" className="btn btn-ghost">Pesan lagi</a>
        <p className="text-center text-sm text-ink-2" aria-live="polite">{secs !== null ? `Diperbarui ${secs} detik lalu` : 'Memuat status…'}</p>
      </div>

      <FloatingDock />
    </Shell>
  );
}

// Panel QRIS dan bukti pembayaran. Hanya tampil untuk pesanan QRIS atau Transfer.
function PaymentPanel({ o, code, reload, waLink }) {
  const [qrMissing, setQrMissing] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const verified = o.paymentStatus === 'terverifikasi';

  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(e) {
    const f = e.target.files?.[0];
    setMsg('');
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) { setMsg('Foto terlalu besar. Maksimal 4 MB.'); setFile(null); e.target.value = ''; return; }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setMsg('Pilih foto berformat JPG, PNG, atau WebP.'); setFile(null); e.target.value = ''; return; }
    setFile(f);
  }

  async function send(e) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`/api/orders/${code}/payment-proof`, { method: 'POST', body: fd, cache: 'no-store' });
      const text = await r.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!r.ok) {
        setMsg(data.error || `Bukti belum terkirim (kode ${r.status}). Coba lagi sebentar.`);
      } else {
        setFile(null);
        setMsg('Bukti terkirim. Penjual akan memverifikasi pembayaranmu.');
        reload();
      }
    } catch {
      setMsg('Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.');
    }
    setBusy(false);
  }

  async function sendToWhatsApp() {
    if (!file || busy) return;
    const text = proofMessage(o);
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        setMsg('Foto dan detail pesanan siap dikirim melalui WhatsApp.');
        return;
      } catch {
        setMsg('Pengiriman dibatalkan. Pilih file lalu coba lagi.');
        return;
      }
    }
    const number = waNumber(waLink);
    if (!number) {
      setMsg('WhatsApp seller belum tersedia.');
      return;
    }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    setMsg('WhatsApp dibuka dengan detail pesanan. Lampirkan foto yang dipilih lalu kirim.');
  }

  return (
    <section className="card space-y-4 p-6" aria-label="Pembayaran">
      <h2 className="text-lg font-bold">Pembayaran {o.payment}</h2>

      {o.payment === 'QRIS' && !verified && (
        <div className="space-y-3 text-center">
          <p className="text-ink-2">Scan QRIS di bawah lalu bayar <b className="text-ink">{rp(o.total)}</b>.</p>
          {qrMissing ? (
            <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">QRIS belum tersedia. Hubungi penjual lewat WhatsApp untuk cara bayar.</p>
          ) : (
            <div className="mx-auto max-w-xs rounded-2xl bg-white p-3 shadow-md">
              {/* Latar putih sengaja dipakai agar QR mudah dipindai di mode gelap. */}
              <img src="/qris.png" alt="Kode QRIS Kaboba Time" className="mx-auto h-auto w-full" onError={() => setQrMissing(true)} />
            </div>
          )}
          {!qrMissing && (
            <a href="/qris.png" download="QRIS-Kaboba-Time.png" className="btn btn-ghost btn-sm mx-auto">Unduh QRIS (gambar asli)</a>
          )}
        </div>
      )}

      {o.payment === 'Transfer' && !verified && (
        <p className="text-ink-2">Transfer <b className="text-ink">{rp(o.total)}</b> ke rekening penjual. Nomor rekening dikirim penjual lewat WhatsApp, lalu kirim bukti transfer di bawah.</p>
      )}

      {verified && <p role="status" className="rounded-xl bg-leaf-soft p-3 font-semibold text-leaf">Pembayaranmu sudah terverifikasi. Terima kasih!</p>}
      {o.paymentStatus === 'menunggu' && !verified && <p role="status" className="rounded-xl bg-sky-soft p-3 font-semibold text-sky">Bukti sudah dikirim dan menunggu verifikasi penjual.</p>}
      {o.paymentStatus === 'ditolak' && <p role="alert" className="rounded-xl bg-warn-soft p-3 font-semibold text-warn-text">Bukti ditolak: {o.paymentNote}. Silakan kirim ulang.</p>}

      {!verified && (
        <form onSubmit={send} className="space-y-3">
          <div>
            <label htmlFor="bukti" className="mb-1.5 block font-semibold">Foto bukti transfer / pembayaran</label>
            <input id="bukti" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} disabled={busy}
              className="block w-full text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-brand-dark" />
            <p className="mt-1 text-xs text-ink-2">JPG, PNG, atau WebP, maksimal 4 MB.</p>
          </div>
          {preview && <img src={preview} alt="Pratinjau bukti pembayaran" className="max-h-64 w-full rounded-2xl object-contain bg-paper" />}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="submit" className="btn" disabled={!file || busy}>{busy ? 'Mengirim bukti…' : 'Kirim ke website'}</button>
            <button type="button" onClick={sendToWhatsApp} className="btn btn-ghost" disabled={!file || busy}>Kirim foto + detail ke WhatsApp</button>
          </div>
          <p className="text-xs text-ink-2">Pilih salah satu cara pengiriman. WhatsApp akan menyertakan foto dan detail pesanan bila perangkat mendukung berbagi file.</p>
          {msg && <p role="alert" className="text-sm font-semibold text-ink">{msg}</p>}
        </form>
      )}
    </section>
  );
}

// Teks bukti pembayaran untuk WhatsApp (versi klien dari lib/orders.js).
function proofMessage(o) {
  const L = [`*BUKTI PEMBAYARAN - KABOBA TIME*`, `Kode order: *${o.code}*`, `Nama: ${o.name}`, `WhatsApp: ${o.phone}`, `Metode: ${o.payment}`, '', '*Pesanan*'];
  o.items.forEach((it, i) => {
    const addons = it.addons.length ? ` + ${it.addons.map((a) => a.name).join(', ')}` : '';
    L.push(`${i + 1}. ${it.name}${addons} x${it.qty} = ${rp(it.price * it.qty)}`);
    if (it.note) L.push(`   Catatan: ${it.note}`);
  });
  if (o.mode === 'antar') {
    L.push('', `Antar ke: ${o.address}`);
    if (o.distanceKm != null) L.push(`Jarak: ${String(o.distanceKm).replace('.', ',')} km`);
  } else {
    L.push('', 'Ambil di outlet');
  }
  L.push('', `Subtotal: ${rp(o.subtotal)}`, `Ongkir: ${o.fee ? rp(o.fee) : 'Gratis'}`, `*Total: ${rp(o.total)}*`);
  if (o.note) L.push(`Catatan pesanan: ${o.note}`);
  return L.join('\n');
}

// Nomor penjual diambil dari tautan WhatsApp pesanan (https://wa.me/<nomor>?text=...).
function waNumber(link) {
  const m = /wa\.me\/(\d+)/.exec(link || '');
  return m ? m[1] : '';
}
