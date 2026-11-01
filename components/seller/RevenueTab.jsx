'use client';
import { useEffect, useMemo, useState } from 'react';
import { rp } from '@/lib/format';
import { api } from './shared';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const businessToday = () => { const d = new Date(); if (d.getHours() < 16) d.setDate(d.getDate() - 1); return iso(d); };
const today = businessToday;
const subtract = (n) => { const d = new Date(`${businessToday()}T12:00:00`); d.setDate(d.getDate() - n); return iso(d); };
const monthStart = () => { const d = new Date(`${businessToday()}T12:00:00`); d.setDate(1); return iso(d); };
const csvCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

export default function RevenueTab() {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customDates, setCustomDates] = useState(false);

  async function load(start = from, end = to) {
    setLoading(true); setError('');
    const r = await api(`/api/seller/revenue?dari=${start}&sampai=${end}`);
    setLoading(false);
    if (!r.ok) { setData(null); setError(r.data.error || 'Rekap belum bisa dimuat.'); return; }
    setData(r.data);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const quick = (start, end = today()) => { setCustomDates(false); setFrom(start); setTo(end); load(start, end); };
  const maxDaily = useMemo(() => Math.max(1, ...(data?.daily || []).map((r) => r.revenue)), [data]);
  const download = () => {
    if (!data) return;
    const rows = [['Tanggal', 'Pesanan selesai', 'Pendapatan kotor', 'Diskon', 'Pendapatan bersih'], ...data.daily.map((r) => [r.date, r.orders, r.grossRevenue, r.discounts, r.revenue])];
    const csv = `\uFEFF${rows.map((r) => r.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `rekap-pendapatan-${data.from}-${data.to}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const downloadPdf = () => { window.open(`/api/seller/revenue/pdf?dari=${data.from}&sampai=${data.to}`, '_blank', 'noopener,noreferrer'); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost btn-sm" onClick={() => quick(today())}>Hari ini</button>
        <button className="btn btn-ghost btn-sm" onClick={() => quick(subtract(6))}>7 hari</button>
        <button className="btn btn-ghost btn-sm" onClick={() => quick(subtract(29))}>30 hari</button>
        <button className="btn btn-ghost btn-sm" onClick={() => quick(monthStart())}>Bulan ini</button>
        <button className={`btn btn-ghost btn-sm ${customDates ? 'ring-2 ring-brand' : ''}`} onClick={() => setCustomDates(true)}>Pilih tanggal</button>
        <button className="btn btn-sm" onClick={load} disabled={loading}>{loading ? 'Memuat…' : 'Terapkan tanggal'}</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="font-semibold">Dari<input type="date" className="field mt-1" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="font-semibold">Sampai<input type="date" className="field mt-1" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      {error && <p role="alert" className="rounded-xl bg-warn-soft p-3 font-semibold text-warn-text">{error}</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Pendapatan bersih" value={rp(data.summary.revenue)} />
            <Card label="Diskon" value={rp(data.summary.discounts)} />
            <Card label="Pesanan selesai" value={data.summary.completedOrders} />
            <Card label="Masih berjalan" value={data.summary.runningOrders} />
            <Card label="Dibatalkan" value={data.summary.cancelledOrders} />
            <Card label="Rata-rata selesai" value={rp(data.summary.averageRevenue)} />
            <Card label="Bukti terverifikasi" value={data.summary.verifiedPayments} />
          </div>
          <section className="card space-y-3 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Pendapatan per hari</h2><div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={download}>Unduh CSV</button><button className="btn btn-ghost btn-sm" onClick={downloadPdf}>Unduh PDF</button></div></div>
            {data.daily.length ? data.daily.map((r) => <div key={r.date} className="space-y-1"><div className="flex justify-between gap-2 text-sm"><span>{r.date} · {r.orders} pesanan</span><b>{rp(r.revenue)}</b></div><div className="h-2 rounded-full bg-paper"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(3, r.revenue / maxDaily * 100)}%` }} /></div></div>) : <p className="text-ink-2">Belum ada pesanan selesai.</p>}
          </section>
          <div className="grid gap-5 lg:grid-cols-3">
            <ListCard title="Metode pembayaran" rows={data.paymentMethods.map((r) => [`${r.payment} · ${r.orders} pesanan`, rp(r.revenue)])} />
            <ListCard title="Jam ramai" rows={data.busyHours.slice(0, 5).map((r) => [`${pad(r.hour)}:00 · ${r.orders} pesanan`, rp(r.revenue)])} />
            <ListCard title="Menu terlaris" rows={data.topProducts.map((r) => [`${r.name} · ${r.quantity} terjual`, rp(r.revenue)])} />
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value }) { return <div className="card p-4"><p className="text-sm text-ink-2">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>; }
function ListCard({ title, rows }) { return <section className="card p-5"><h2 className="mb-3 text-lg font-bold">{title}</h2>{rows.length ? <ul className="space-y-2 text-sm">{rows.map(([a, b]) => <li key={`${a}-${b}`} className="flex justify-between gap-2 border-b border-line pb-2"><span>{a}</span><b className="shrink-0">{b}</b></li>)}</ul> : <p className="text-ink-2">Belum ada data.</p>}</section>; }
