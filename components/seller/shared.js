import { rp, intlPhone } from '@/lib/format';

// Pemanggil API: selalu mengembalikan { ok, status, data }. Respons non-JSON tidak melempar error.
export async function api(url, method = 'GET', body) {
  try {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const r = await fetch(url, {
      method,
      cache: 'no-store',
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.' } };
  }
}

export const FILTERS = [['semua', 'Semua'], ['baru', 'Baru'], ['diproses', 'Diproses'], ['siap', 'Siap / diantar'], ['selesai', 'Selesai'], ['batal', 'Batal']];
export const NEXT = { baru: ['diproses', 'Terima pesanan'], diproses: ['siap', null], siap: ['selesai', 'Tandai selesai'] };
export const BADGE = {
  baru: 'bg-brand-soft text-brand-dark',
  diproses: 'bg-sky-soft text-sky',
  siap: 'bg-leaf-soft text-leaf',
  selesai: 'bg-paper text-ink-2 ring-1 ring-line',
  batal: 'bg-warn-soft text-warn-text',
};
export const PAYBADGE = {
  belum: 'bg-paper text-ink-2 ring-1 ring-line',
  menunggu: 'bg-brand text-white',
  terverifikasi: 'bg-leaf-soft text-leaf',
  ditolak: 'bg-warn-soft text-warn-text',
};
export const PAYTEXT = { belum: 'Belum ada bukti', menunggu: 'Bukti baru, cek', terverifikasi: 'Lunas', ditolak: 'Bukti ditolak' };
export const soldWord = (p) => (p.sold_label === 'kosong' ? 'Kosong' : 'Habis');

export const when = (t) => {
  const d = new Date(t);
  const same = d.toDateString() === new Date().toDateString();
  return (same ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ') + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

// Pesan balasan untuk pembeli, sesuai status pesanan.
export function reply(o) {
  const t = rp(o.total);
  if (o.status === 'diproses') return `Halo ${o.name}, pesanan ${o.code} sudah kami terima dan sedang disiapkan. Total ${t}, pembayaran ${o.payment}. Mohon ditunggu ya.`;
  if (o.status === 'siap') return o.mode === 'antar' ? `Halo ${o.name}, pesanan ${o.code} sedang diantar ke alamatmu. Total ${t}.` : `Halo ${o.name}, pesanan ${o.code} sudah siap diambil di outlet. Total ${t}.`;
  if (o.status === 'selesai') return `Terima kasih ${o.name}, pesanan ${o.code} sudah selesai. Sampai jumpa di Kaboba Time!`;
  if (o.status === 'batal') return `Halo ${o.name}, mohon maaf pesanan ${o.code} kami batalkan. Hubungi kami kalau ada pertanyaan.`;
  return `Halo ${o.name}, pesanan ${o.code} sudah kami terima. Total ${t}, pembayaran ${o.payment}. Kami konfirmasi sebentar lagi ya.`;
}

export const chatUrl = (o) => `https://wa.me/${intlPhone(o.phone)}?text=${encodeURIComponent(reply(o))}`;
