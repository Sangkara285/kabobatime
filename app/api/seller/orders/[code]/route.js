import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { loadOrder } from '@/lib/orders';
import { flat } from '@/lib/format';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const STATUSES = ['baru', 'diproses', 'siap', 'selesai', 'batal'];
const err = (error, status) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function GET(_req, { params }) {
  if (!isSeller()) return err('Belum masuk.', 401);
  const order = await loadOrder(String(params.code).toUpperCase(), { seller: true });
  if (!order) return err('Pesanan tidak ditemukan.', 404);
  return NextResponse.json({ order }, { headers: NO_STORE });
}

// Body: { status } untuk ubah status pesanan, atau { payment: 'terverifikasi' | 'ditolak', note } untuk bukti pembayaran.
export async function PATCH(req, { params }) {
  if (!isSeller()) return err('Belum masuk.', 401);
  const code = String(params.code).toUpperCase();
  const b = await req.json().catch(() => ({}));
  try {
    const [[o]] = await pool().query('SELECT id, payment, total, payment_proof, payment_status, courier_id FROM orders WHERE code = ?', [code]);
    if (!o) return err('Pesanan tidak ditemukan.', 404);

    if (b.status !== undefined) {
      if (!STATUSES.includes(b.status)) return err('Status tidak valid.', 400);
      if (b.status === 'selesai') await pool().query('UPDATE orders SET status = ?, completed_at = COALESCE(completed_at, NOW()) WHERE id = ?', [b.status, o.id]);
      else await pool().query('UPDATE orders SET status = ?, completed_at = NULL WHERE id = ?', [b.status, o.id]);
    }

    if (b.payment !== undefined) {
      if (!['terverifikasi', 'ditolak'].includes(b.payment)) return err('Aksi pembayaran tidak valid.', 400);
      if (!o.payment_proof) return err('Belum ada bukti pembayaran untuk pesanan ini.', 409);
      const note = b.payment === 'ditolak' ? flat(b.note).slice(0, 160) || 'Bukti tidak jelas, mohon kirim ulang.' : null;
      const legacy = ['pending', 'verified', 'rejected'].includes(o.payment_status);
      const nextPayment = legacy ? { terverifikasi: 'verified', ditolak: 'rejected' }[b.payment] : b.payment;
      await pool().query('UPDATE orders SET payment_status = ?, payment_reject_note = ? WHERE id = ?', [nextPayment, note, o.id]);
    }

    if (b.cash_received !== undefined) {
      if (o.payment !== 'Tunai') return err('Pencatatan uang diterima hanya untuk pembayaran tunai.', 400);
      const received = Number(b.cash_received);
      if (!Number.isInteger(received) || received < o.total) return err('Uang diterima harus berupa angka bulat dan minimal sama dengan total.', 400);
      await pool().query(
        "UPDATE orders SET cash_received = ?, cash_change = ?, cash_paid_at = NOW(), payment_status = ?, payment_reject_note = NULL WHERE id = ?",
        [received, received - o.total, ['pending', 'verified', 'rejected'].includes(o.payment_status) ? 'verified' : 'terverifikasi', o.id],
      );
    }

    if (b.courier_id !== undefined) {
      const courierId = b.courier_id === null || b.courier_id === '' ? null : Number(b.courier_id);
      if (courierId !== null && !Number.isInteger(courierId)) return err('Kurir tidak valid.', 400);
      if (courierId !== null) {
        const [[courier]] = await pool().query('SELECT id FROM couriers WHERE id = ? AND active = 1', [courierId]);
        if (!courier) return err('Kurir tidak ditemukan atau tidak aktif.', 400);
      }
      await pool().query('UPDATE orders SET courier_id = ? WHERE id = ?', [courierId, o.id]);
    }

    return NextResponse.json({ ok: true, order: await loadOrder(code, { seller: true }) }, { headers: NO_STORE });
  } catch (e) {
    console.error(e);
    return err('Perubahan belum tersimpan. Coba lagi.', 500);
  }
}
