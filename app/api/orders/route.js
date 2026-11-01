import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { flat } from '@/lib/format';
import { getSettings } from '@/lib/settings';
import { quote } from '@/lib/delivery';
import { genCode, loadOrder, waUrl } from '@/lib/orders';

export const dynamic = 'force-dynamic';
const bad = (msg, status = 400, extra = {}) => NextResponse.json({ error: msg, ...extra }, { status });

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return bad('Data pesanan tidak terbaca.'); }

  const name = flat(b.name).slice(0, 100);
  const phone = flat(b.phone).slice(0, 30);
  const mode = b.mode === 'ambil' ? 'ambil' : 'antar';
  const address = flat(b.address).slice(0, 400);
  if (b.payment !== undefined && !['Tunai', 'QRIS'].includes(b.payment)) return bad('Metode pembayaran tidak tersedia.', 400);
  const payment = b.payment || 'Tunai';
  const note = flat(b.note).slice(0, 240);
  const digits = phone.replace(/\D/g, '');

  if (!name) return bad('Isi nama kamu.');
  if (digits.length < 9 || digits.length > 15) return bad('Nomor WhatsApp belum benar.');
  if (mode === 'antar' && address.length < 8) return bad('Isi alamat lengkap untuk pengantaran.');
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 40) return bad('Keranjang kosong.');

  const ids = new Set();
  for (const it of b.items) { ids.add(+it.id); (it.addons || []).forEach((a) => ids.add(+a)); }
  const [rows] = await pool().query('SELECT id, name, price, is_addon, has_addons, available, sold_label FROM products WHERE id IN (?)', [[...ids]]);
  const P = new Map(rows.map((r) => [r.id, r]));

  const lines = [];
  const soldOut = [];
  let subtotal = 0;
  for (const it of b.items) {
    const p = P.get(+it.id);
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 0), 50);
    if (!p || p.is_addon || !qty) return bad('Ada menu yang sudah tidak tersedia. Muat ulang halaman.', 409, { reload: true });
    if (!p.available) { soldOut.push({ id: p.id, name: p.name, label: p.sold_label }); continue; }
    const addons = [];
    if (p.has_addons) {
      for (const aid of new Set((it.addons || []).map(Number))) {
        const a = P.get(aid);
        if (a && a.is_addon && a.available) addons.push({ id: a.id, name: a.name, price: a.price });
      }
    }
    const unit = p.price + addons.reduce((s, a) => s + a.price, 0);
    subtotal += unit * qty;
    lines.push({ product_id: p.id, name: p.name, unit_price: unit, qty, addons, note: flat(it.note).slice(0, 160) });
  }
  if (soldOut.length) {
    const names = soldOut.map((s) => `${s.name} (${s.label})`).join(', ');
    return bad(`Maaf, ${names} baru saja habis. Hapus dari keranjang lalu coba lagi.`, 409, { soldOut });
  }

  const settings = await getSettings();
  let fee = 0, lat = null, lng = null, km = null, source = null;
  if (mode === 'antar') {
    const q = await quote(settings, { lat: b.lat, lng: b.lng }, subtotal);
    if (!q.ok) return bad('Tentukan lokasi antar di peta dulu.');
    if (!q.withinRange) return bad(`Lokasi kamu ${q.km} km dari outlet, di luar jangkauan antar (maks ${q.maxKm} km). Pilih ambil sendiri atau hubungi kami lewat WhatsApp.`);
    fee = q.fee; lat = Number(b.lat); lng = Number(b.lng); km = q.km; source = q.source;
  }
  const discount = Math.min(subtotal, Math.round(subtotal * (Number(settings.discount_percent) || 0) / 100));
  const total = subtotal - discount + fee;

  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    let code, orderId;
    for (let t = 0; t < 6; t++) {
      code = genCode();
      try {
        const [r] = await conn.query(
          `INSERT INTO orders (code, customer_name, phone, mode, address, lat, lng, distance_km, distance_source, payment, note, subtotal, discount_amount, fee, total)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [code, name, phone, mode, mode === 'antar' ? address : null, lat, lng, km, source, payment, note || null, subtotal, discount, fee, total]);
        orderId = r.insertId; break;
      } catch (e) { if (e.code !== 'ER_DUP_ENTRY' || t === 5) throw e; }
    }
    for (const l of lines) {
      await conn.query('INSERT INTO order_items (order_id, product_id, name, unit_price, qty, addons, note) VALUES (?,?,?,?,?,?,?)',
        [orderId, l.product_id, l.name, l.unit_price, l.qty, JSON.stringify(l.addons), l.note || null]);
    }
    await conn.commit();
    const order = await loadOrder(code);
    return NextResponse.json({ code, order, waUrl: waUrl(order, settings.wa_number) });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    return bad('Pesanan belum bisa disimpan. Coba lagi sebentar.', 500);
  } finally { conn.release(); }
}
