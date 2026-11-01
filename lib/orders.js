import { pool } from './db';
import { rp, PAY_STATUS } from './format';
import { TRACKING_EXPIRY_MINUTES } from './config';
import { genCode } from './order-code';
import { publicOrder } from './order-public';

export { genCode, publicOrder };

export async function loadOrder(code, { seller = false } = {}) {
  const [rows] = await pool().query(
    `SELECT o.*, c.name AS courier_name FROM orders o LEFT JOIN couriers c ON c.id = o.courier_id WHERE o.code = ? AND (? = 1 OR o.status <> ? OR o.completed_at IS NULL OR o.completed_at >= NOW() - INTERVAL ${TRACKING_EXPIRY_MINUTES} MINUTE)`,
    [code, seller ? 1 : 0, 'selesai'],
  );
  const o = rows[0];
  if (!o) return null;
  const [items] = await pool().query('SELECT name, unit_price, qty, addons, note FROM order_items WHERE order_id = ? ORDER BY id', [o.id]);
  return shape(o, items, { seller });
}

// seller = true menambahkan alamat file bukti. Pembeli tidak pernah menerima alamat file itu.
export function shape(o, items, { seller = false } = {}) {
  const num = (v) => (v === null || v === undefined ? null : Number(v));
  const paymentStatus = { pending: 'menunggu', verified: 'terverifikasi', rejected: 'ditolak' }[o.payment_status] || o.payment_status || 'belum';
  return {
    code: o.code, name: o.customer_name, phone: o.phone, mode: o.mode, address: o.address || '', payment: o.payment,
    note: o.note || '', subtotal: o.subtotal, discount: o.discount_amount || 0, fee: o.fee, total: o.total, status: o.status,
    createdAt: o.created_at, completedAt: o.completed_at || null,
    shippedAt: o.shipped_at || null, courierName: o.courier_name || null,
    acceptedAt: o.accepted_at || null, readyAt: o.ready_at || null,
    lat: num(o.lat), lng: num(o.lng), distanceKm: num(o.distance_km),
    paymentStatus,
    paymentLabel: PAY_STATUS[paymentStatus],
    paymentNote: o.payment_reject_note || '',
    proofAt: o.payment_proof_at || null,
    cashReceived: num(o.cash_received), cashChange: num(o.cash_change), cashPaidAt: o.cash_paid_at || null,
    cashAmount: num(o.cash_amount),
    courierId: o.courier_id ? Number(o.courier_id) : null,
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
  if (o.payment === 'QRIS' && o.paymentStatus === 'menunggu') return 'QRIS (bukti sudah diunggah di website)';
  if (o.payment === 'QRIS' && o.paymentStatus === 'terverifikasi') return 'QRIS (bukti terverifikasi)';
  const st = { belum: 'belum ada bukti', menunggu: 'bukti sudah dikirim, menunggu verifikasi', terverifikasi: 'terverifikasi', ditolak: 'bukti ditolak, perlu kirim ulang' }[o.paymentStatus] || '';
  return `${o.payment}${st ? ` (${st})` : ''}`;
};

export function waMessage(o) {
  const L = [];
  L.push('*PESANAN BARU - KABOBA TIME*');
  L.push(`Kode order: *${o.code}*`, '');
  L.push(`Nama: ${o.name}`);
  if (o.phone) L.push(`WhatsApp: ${o.phone}`);
  L.push(`Layanan: ${o.mode === 'antar' ? 'Antar ke alamat' : 'Ambil di outlet'}`);
  if (o.mode === 'antar') {
    if (o.address) L.push(`Alamat: ${o.address}`);
    if (o.distanceKm != null) L.push(`Jarak: ${String(o.distanceKm).replace('.', ',')} km`);
    if (mapsUrl(o)) L.push(`Lokasi: ${mapsUrl(o)}`);
  }
  L.push(`Pembayaran: ${payText(o)}`, '', '*Pesanan*');
  o.items.forEach((it, i) => {
    const ad = it.addons.length ? ` + ${it.addons.map((a) => a.name).join(', ')}` : '';
    L.push(`${i + 1}. ${it.name}${ad} x${it.qty} = ${rp(it.price * it.qty)}`);
    if (it.note) L.push(`   Catatan: ${it.note}`);
  });
  L.push('', `Subtotal: ${rp(o.subtotal)}`, ...(o.discount ? [`Diskon: -${rp(o.discount)}`] : []), `Ongkir: ${o.fee ? rp(o.fee) : 'Gratis'}`, `*Total: ${rp(o.total)}*`);
  if (o.note) L.push('', `Catatan: ${o.note}`);
  return L.join('\n');
}
export const waUrl = (o, number) => `https://wa.me/${number}?text=${encodeURIComponent(waMessage(o))}`;
