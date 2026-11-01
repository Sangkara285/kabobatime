import { NextResponse } from 'next/server';
import { courierId } from '@/lib/courier-auth';
import { pool } from '@/lib/db';
import { loadOrder } from '@/lib/orders';

export async function PATCH(_req, { params }) {
  const id = courierId();
  if (id === null) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const code = String(params.code).toUpperCase();
  const [[order]] = await pool().query("SELECT id FROM orders WHERE code = ? AND mode = 'antar' AND status IN ('siap','diproses') AND (courier_id = ? OR courier_id IS NULL)", [code, id]);
  if (!order) return NextResponse.json({ error: 'Tugas antar tidak ditemukan atau sudah diambil.' }, { status: 404 });
  const [result] = await pool().query("UPDATE orders SET courier_id = ?, status = 'selesai', completed_at = COALESCE(completed_at, NOW()) WHERE id = ? AND (courier_id = ? OR courier_id IS NULL)", [id, order.id, id]);
  if (!result.affectedRows) return NextResponse.json({ error: 'Pesanan sudah diambil kurir lain.' }, { status: 409 });
  return NextResponse.json({ ok: true, order: await loadOrder(code, { seller: true }) });
}
