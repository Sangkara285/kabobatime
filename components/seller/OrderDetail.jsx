'use client';
import { useCallback, useEffect, useState } from 'react';
import BackButton from '@/components/BackButton';
import FloatingDock from '@/components/FloatingDock';
import { rp, statusLabel } from '@/lib/format';
import { api, NEXT, BADGE, PAYBADGE, PAYTEXT, chatUrl, reply, when } from './shared';

const STEPS = ['baru', 'diproses', 'siap', 'selesai'];

// Di luar komponen agar tidak dibuat ulang setiap render (input di dalamnya tetap punya fokus).
function Shell({ children }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 py-4 pb-28" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
      <BackButton href="/penjual#pesanan" label="Kembali ke pesanan" />
      {children}
      <FloatingDock showDashboard={false} />
    </div>
  );
}

export default function OrderDetail({ code }) {
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState('Bukti tidak jelas, mohon kirim ulang.');
  const [zoom, setZoom] = useState(false);
  const [scale, setScale] = useState(150);
  const [copied, setCopied] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [couriers, setCouriers] = useState([]);

  const load = useCallback(async () => {
    const r = await api(`/api/seller/orders/${code}`);
    if (r.status === 401) { setErr('Sesi penjual sudah habis. Masuk lagi di halaman penjual.'); return; }
    if (!r.ok) { setErr(r.data.error || 'Pesanan tidak bisa dibuka.'); return; }
    setErr('');
    setO(r.data.order);
    setCashReceived((current) => current || (r.data.order.cashAmount ? String(r.data.order.cashAmount) : ''));
  }, [code]);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  useEffect(() => { api('/api/seller/couriers').then((r) => r.ok && setCouriers(r.data.couriers || [])); }, []);

  useEffect(() => {
    if (!zoom) return undefined;
    const k = (e) => e.key === 'Escape' && setZoom(false);
    document.addEventListener('keydown', k);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.documentElement.style.overflow = prev; };
  }, [zoom]);

  async function act(body, okMsg) {
    setBusy(true); setMsg('');
    const r = await api(`/api/seller/orders/${code}`, 'PATCH', body);
    setBusy(false);
    if (!r.ok) { setMsg(r.data.error || 'Perubahan belum tersimpan. Coba lagi.'); return; }
    setO(r.data.order);
    setMsg(okMsg);
    setConfirmCancel(false);
    setRejecting(false);
  }

  async function copyReply() {
    try { await navigator.clipboard.writeText(reply(o)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setMsg('Browser menolak akses clipboard. Salin pesannya lewat tombol Chat pembeli.'); }
  }

  if (!o) {
    return <Shell>{err ? <div role="alert" className="card p-6 text-warn-text">{err}</div> : <p className="text-ink-2">Memuat pesanan…</p>}</Shell>;
  }

  const nx = NEXT[o.status];
  const nxLabel = nx && (nx[1] || (o.mode === 'antar' ? 'Tandai diantar' : 'Siap diambil'));
  const idx = STEPS.indexOf(o.status);
  const hasPay = o.payment !== 'Tunai';
  const verified = o.paymentStatus === 'terverifikasi';

  return (
    <Shell>
      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="select-all font-mono text-2xl font-medium text-brand-dark sm:text-3xl">{o.code}</p>
            <p className="text-sm text-ink-2">Masuk {when(o.createdAt)}{o.completedAt ? ` · selesai ${when(o.completedAt)}` : ''}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${BADGE[o.status]}`}>{statusLabel(o.status, o.mode)}</span>
        </div>

        {o.status !== 'batal' && (
          <ol className="grid grid-cols-4 gap-1 pt-1" aria-label="Tahap pesanan">
            {STEPS.map((s, i) => (
              <li key={s} className={`rounded-full py-1 text-center text-[11px] font-bold ${idx >= i ? 'bg-brand text-white' : 'bg-paper text-ink-2 ring-1 ring-line'}`}>
                {statusLabel(s, o.mode)}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card space-y-3 p-5" aria-label="Aksi">
        <h2 className="text-lg font-bold">Aksi</h2>
        <div className="flex flex-wrap gap-2">
          {nx && <button className="btn flex-1 sm:flex-none sm:px-6" disabled={busy} onClick={() => act({ status: nx[0] }, `Status diubah ke ${statusLabel(nx[0], o.mode)}`)}>{nxLabel}</button>}
          <a className="btn btn-wa flex-1 sm:flex-none sm:px-6" target="_blank" rel="noopener noreferrer" href={chatUrl(o)}>Chat pembeli</a>
          <button type="button" className="btn btn-ghost flex-1 sm:flex-none" onClick={copyReply}>{copied ? 'Pesan tersalin' : 'Salin pesan balasan'}</button>
        </div>
        {o.status === 'batal' ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act({ status: 'baru' }, 'Pesanan diaktifkan lagi')}>Aktifkan lagi</button>
        ) : o.status !== 'selesai' && (confirmCancel ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-2xl bg-warn-soft p-3 text-warn-text">
            <span className="flex-1 basis-48 font-semibold">Batalkan pesanan ini?</span>
            <button type="button" className="btn btn-sm bg-warn hover:bg-warn" disabled={busy} onClick={() => act({ status: 'batal' }, 'Pesanan dibatalkan')}>Ya, batalkan</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmCancel(false)}>Jangan</button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm w-auto text-warn-text" onClick={() => setConfirmCancel(true)}>Batalkan pesanan</button>
        ))}
        {msg && <p role="status" className="text-sm font-semibold text-ink">{msg}</p>}
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="text-lg font-bold">Pelanggan</h2>
        <p className="font-semibold">{o.name}</p>
        <p className="text-ink-2"><a className="underline" href={`tel:${o.phone}`}>{o.phone}</a> · {o.mode === 'antar' ? 'Antar ke alamat' : 'Ambil di outlet'}</p>
        {o.mode === 'antar' && (
          <div className="space-y-1 text-sm">
            <p className="break-words">{o.address}</p>
            {o.distanceKm != null && (
              <p>Jarak {String(o.distanceKm).replace('.', ',')} km{o.lat != null && <> · <a className="font-semibold text-brand-dark underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}>Buka di Google Maps</a></>}</p>
            )}
          </div>
        )}
        {o.note && <p className="rounded-xl bg-paper p-3 text-sm">Catatan: {o.note}</p>}
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Pesanan</h2>
        <ul className="divide-y divide-line">
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
        <div className="mt-3 space-y-1 border-t border-dashed border-line pt-3">
          <div className="flex justify-between"><span>Subtotal</span><span className="num">{rp(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-leaf"><span>Diskon</span><span className="num">-{rp(o.discount)}</span></div>}
          <div className="flex justify-between"><span>Ongkir</span><span className="num">{o.fee ? rp(o.fee) : 'Gratis'}</span></div>
          <div className="flex justify-between text-lg font-extrabold"><span>Total</span><span className="num">{rp(o.total)}</span></div>
        </div>
      </section>

      <section className="card space-y-4 p-5" aria-label="Pembayaran">
        {o.mode === 'antar' && (
          <div>
            <label htmlFor="courier" className="mb-1.5 block font-semibold">Kurir</label>
            <select id="courier" className="field" disabled={o.status === 'baru' || o.status === 'batal' || o.status === 'selesai' || busy} value={o.courierId || ''} onChange={(e) => act({ courier_id: e.target.value }, 'Penugasan kurir disimpan')}>
              <option value="">Belum ditugaskan</option>
              {couriers.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.username})</option>)}
            </select>
            {o.status === 'baru' && <p className="mt-1 text-sm text-ink-2">Terima pesanan dulu untuk memilih kurir.</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Pembayaran: {o.payment}</h2>
          {hasPay && <span className={`rounded-full px-3 py-1 text-sm font-bold ${PAYBADGE[o.paymentStatus]}`}>{PAYTEXT[o.paymentStatus]}</span>}
        </div>

        {!hasPay && <p className="text-ink-2">Dibayar tunai saat pesanan diterima. Tidak perlu bukti pembayaran.</p>}
        {!hasPay && (o.cashAmount
          ? <p className="rounded-xl bg-brand-soft p-3 font-semibold">Pembeli menyiapkan {rp(o.cashAmount)}. Kembalian {rp(Math.max(0, o.cashAmount - o.total))}.</p>
          : <p className="rounded-xl bg-leaf-soft p-3 font-semibold text-leaf">Uang pas.</p>)}
        {!hasPay && !o.cashPaidAt && (
          <div className="space-y-2 rounded-2xl bg-paper p-3">
            <label htmlFor="cash-received" className="block font-semibold">Uang tunai diterima (Rp)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="cash-received" type="text" className="field min-w-0 flex-1" inputMode="numeric" autoComplete="off" value={cashReceived} onChange={(e) => setCashReceived(e.target.value.replace(/[^\d]/g, ''))} placeholder={String(o.total)} />
              <button type="button" className="btn w-full shrink-0 sm:w-auto" disabled={busy || !cashReceived} onClick={() => act({ cash_received: Number(cashReceived) }, 'Pembayaran tunai dicatat')}>Catat tunai</button>
            </div>
            <p className="text-xs text-ink-2">Total {rp(o.total)}. Kembalian dihitung otomatis.</p>
          </div>
        )}
        {!hasPay && o.cashPaidAt && <p className="rounded-xl bg-leaf-soft p-3 font-semibold text-leaf">Tunai diterima {rp(o.cashReceived)} · Kembalian {rp(o.cashChange)}.</p>}
        {hasPay && o.proofUrl && <p className="rounded-xl bg-sky-soft p-3 text-sm font-semibold text-sky">Bukti pembayaran sudah diunggah pembeli di website. Cek foto di bawah, lalu verifikasi atau tolak.</p>}

        {hasPay && !o.proofUrl && <p className="text-ink-2">Pembeli belum mengunggah bukti pembayaran.</p>}

        {hasPay && o.proofUrl && (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">Diunggah {when(o.proofAt)}</p>
            <button type="button" onClick={() => { setScale(150); setZoom(true); }} className="block w-full overflow-hidden rounded-2xl bg-paper ring-1 ring-line" aria-label="Perbesar bukti pembayaran">
              <img src={o.proofUrl} alt="Bukti pembayaran dari pembeli" className="mx-auto max-h-96 w-auto max-w-full object-contain" />
            </button>
            <p className="text-xs text-ink-2">Ketuk gambar untuk memperbesar.</p>

            {o.paymentStatus === 'ditolak' && o.paymentNote && <p className="rounded-xl bg-warn-soft p-3 text-warn-text">Alasan penolakan: {o.paymentNote}</p>}

            {!verified && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn flex-1 bg-leaf-btn hover:brightness-110 sm:flex-none sm:px-6" disabled={busy} onClick={() => act({ payment: 'terverifikasi' }, 'Pembayaran diverifikasi')}>Verifikasi pembayaran</button>
                <button type="button" className="btn btn-ghost flex-1 sm:flex-none" disabled={busy} onClick={() => setRejecting((v) => !v)}>Tolak bukti</button>
              </div>
            )}
            {rejecting && !verified && (
              <div className="space-y-2 rounded-2xl bg-warn-soft p-3">
                <label htmlFor="alasan" className="block font-semibold text-warn-text">Alasan untuk pembeli</label>
                <input id="alasan" className="field" maxLength={160} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                <button type="button" className="btn btn-sm bg-warn hover:bg-warn" disabled={busy} onClick={() => act({ payment: 'ditolak', note: rejectNote }, 'Bukti ditolak, pembeli diminta kirim ulang')}>Kirim penolakan</button>
              </div>
            )}
          </div>
        )}
      </section>

      {zoom && o.proofUrl && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 text-white" role="dialog" aria-modal="true" aria-label="Bukti pembayaran">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <label className="flex items-center gap-3 text-sm font-semibold">
              Perbesar
              <input type="range" min="100" max="400" step="10" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-40 accent-[#FF9A4D]" aria-label="Tingkat perbesaran" />
              <span className="num w-12">{scale}%</span>
            </label>
            <div className="flex items-center gap-2">
              <a href={o.proofUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl px-3 py-2 font-semibold underline">Buka tab baru</a>
              <button type="button" onClick={() => setZoom(false)} aria-label="Tutup" className="grid h-11 w-11 place-items-center rounded-full bg-white text-2xl leading-none text-black">×</button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <img src={o.proofUrl} alt="Bukti pembayaran dari pembeli" style={{ width: `${scale}%`, maxWidth: 'none' }} className="mx-auto h-auto rounded-xl bg-white" />
          </div>
        </div>
      )}
    </Shell>
  );
}
