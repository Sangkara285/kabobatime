import { pool } from './db';
import { rp, PAY_STATUS } from './format';

const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function genCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0');
  return `KBT-${dd}-${s}`;
}

export async function loadOrder(code, { seller = false } = {}) {
  const [[o]] = await pool().query('SELECT * FROM orders WHERE code = ?', [code]);
  if (!o) return null;
  const [items] = await pool().query('SELECT name, unit_price, qty, addons, note FROM order_items WHERE order_id = ? ORDER BY id', [o.id]);
  return shape(o, items, { seller });
}

// seller = true menambahkan alamat file bukti. Pembeli tidak pernah menerima alamat file itu.
export function shape(o, items, { seller = false } = {}) {
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  return {
    code: o.code, name: o.customer_name, phone: o.phone, mode: o.mode, address: o.address || '', payment: o.payment,
    note: o.note || '', subtotal: o.subtotal, fee: o.fee, total: o.total, status: o.status,
    createdAt: o.created_at, completedAt: o.completed_at || null,
    lat: num(o.lat), lng: num(o.lng), distanceKm: num(o.distance_km),
    paymentStatus: o.payment_status || 'belum',
    paymentLabel: PAY_STATUS[o.payment_status || 'belum'],
    paymentNote: o.payment_reject_note || '',
    proofAt: o.payment_proof_at || null,
    waProofAt: o.wa_proof_at || null,
    hasProof: !!o.payment_proof,
    ...(seller ? { proofUrl: o.payment_proof ? `/api/seller/proofs/${o.payment_proof}` : null } : {}),
    items: (items || []).map((i) => ({
      name: i.name, price: i.unit_price, qty: i.qty, note: i.note || '',
      addons: typeof i.addons === 'string' ? JSON.parse(i.addons) : i.addons || [],
    })),
  };
}

export const mapsUrl = (o) => (o.lat != null && o.lng != null ? `https://www.google.com/maps?q=${o.lat},${o.lng}` : '');

const payText = (o) => {
  if (o.payment === 'Tunai') return 'Tunai (bayar saat terima)';
  const st = { belum: 'belum ada bukti', menunggu: 'bukti sudah dikirim, menunggu verifikasi', terverifikasi: 'terverifikasi', ditolak: 'bukti ditolak, perlu kirim ulang' }[o.paymentStatus] || '';
  return `${o.payment}${st ? ` (${st})` : ''}`;
};

export function waMessage(o) {
  const L = [];
  L.push('*PESANAN BARU - KABOBA TIME*');
  L.push(`Kode order: *${o.code}*`, '');
  L.push(`Nama: ${o.name}`, `WhatsApp: ${o.phone}`);
  L.push(`Layanan: ${o.mode === 'antar' ? 'Antar ke alamat' : 'Ambil di outlet'}`);
  if (o.mode === 'antar') {
    L.push(`Alamat: ${o.address}`);
    if (o.distanceKm != null) L.push(`Jarak: ${String(o.distanceKm).replace('.', ',')} km`);
    if (mapsUrl(o)) L.push(`Lokasi: ${mapsUrl(o)}`);
  }
  L.push(`Pembayaran: ${payText(o)}`, '', '*Pesanan*');
  o.items.forEach((it, i) => {
    const ad = it.addons.length ? ` + ${it.addons.map((a) => a.name).join(', ')}` : '';
    L.push(`${i + 1}. ${it.name}${ad} x${it.qty} = ${rp(it.price * it.qty)}`);
    if (it.note) L.push(`   Catatan: ${it.note}`);
  });
  L.push('', `Subtotal: ${rp(o.subtotal)}`, `Ongkir: ${o.fee ? rp(o.fee) : 'Gratis'}`, `*Total: ${rp(o.total)}*`);
  if (o.note) L.push('', `Catatan: ${o.note}`);
  return L.join('\n');
}
export const waUrl = (o, number) => `https://wa.me/${number}?text=${encodeURIComponent(waMessage(o))}`;

// Teks untuk dibagikan bersama bukti transfer: ringkas tapi berisi semua detail.
export function proofText(o) {
  const L = [`Bukti pembayaran - Kode order *${o.code}*`, `Nama: ${o.name}`, `Total: *${rp(o.total)}*`, `Metode: ${o.payment}`];
  L.push('', ...o.items.map((it) => `${it.qty}x ${it.name}${it.addons.length ? ` + ${it.addons.map((a) => a.name).join(', ')}` : ''}`));
  if (o.mode === 'antar') L.push('', `Antar ke: ${o.address}`);
  return L.join('\n');
}
