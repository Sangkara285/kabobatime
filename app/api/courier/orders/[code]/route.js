import { NextResponse } from 'next/server';
import { isCourier } from '@/lib/courier-auth';
import { pool } from '@/lib/db';
import { loadOrder } from '@/lib/orders';

export async function PATCH(_req, { params }) {
  if (!isCourier()) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const code = String(params.code).toUpperCase();
  const [[order]] = await pool().query("SELECT id FROM orders WHERE code = ? AND mode = 'antar' AND status = 'siap'", [code]);
  if (!order) return NextResponse.json({ error: 'Tugas antar tidak ditemukan atau sudah diambil.' }, { status: 404 });
  await pool().query("UPDATE orders SET status = 'selesai', completed_at = COALESCE(completed_at, NOW()) WHERE id = ?", [order.id]);
  return NextResponse.json({ ok: true, order: await loadOrder(code, { seller: true }) });
}
