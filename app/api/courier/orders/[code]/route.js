import { NextResponse } from 'next/server';
import { courierId, isKurir } from '@/lib/courier-auth';
import { pool } from '@/lib/db';
import { loadOrder } from '@/lib/orders';

export async function PATCH(req, { params }) {
  const id = courierId();
  if (!isKurir() || id === null) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.status !== 'selesai') return NextResponse.json({ error: 'Kurir hanya dapat menandai pesanan selesai.' }, { status: 400 });
  const code = String(params.code).toUpperCase();
  const [[order]] = await pool().query("SELECT id FROM orders WHERE code = ? AND mode = 'antar' AND status IN ('siap','diproses') AND courier_id = ?", [code, id]);
  if (!order) return NextResponse.json({ error: 'Tugas antar tidak ditemukan atau sudah diambil.' }, { status: 404 });
  const [result] = await pool().query("UPDATE orders SET status = 'selesai', completed_at = COALESCE(completed_at, NOW()) WHERE id = ? AND courier_id = ? AND status IN ('siap','diproses')", [order.id, id]);
  if (!result.affectedRows) return NextResponse.json({ error: 'Pesanan sudah tidak tersedia.' }, { status: 409 });
  return NextResponse.json({ ok: true, order: await loadOrder(code, { seller: true }) });
}
