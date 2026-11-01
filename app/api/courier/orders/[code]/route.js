import { NextResponse } from 'next/server';
import { clearCourierCookie, courierId } from '@/lib/courier-auth';
import { pool } from '@/lib/db';
import { loadOrder } from '@/lib/orders';

export async function PATCH(req, { params }) {
  const id = await courierId();
  if (id === null) return clearCourierCookie(NextResponse.json({ error: 'Belum masuk.' }, { status: 401 }));
  const body = await req.json().catch(() => ({}));
  if (!['diantar', 'selesai'].includes(body.status)) return NextResponse.json({ error: 'Status kurir tidak valid.' }, { status: 400 });
  const code = String(params.code).toUpperCase();
  const [[order]] = await pool().query('SELECT id, status, courier_id FROM orders WHERE code = ? AND mode = ?', [code, 'antar']);
  if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
  if (Number(order.courier_id) !== id) return NextResponse.json({ error: 'Pesanan ini bukan milikmu.' }, { status: 403 });
  if (body.status === 'diantar') {
    if (order.status !== 'siap') return NextResponse.json({ error: 'Pesanan belum siap diantar.' }, { status: 409 });
    const [result] = await pool().query("UPDATE orders SET status = 'diantar', shipped_at = COALESCE(shipped_at, NOW()) WHERE id = ? AND courier_id = ? AND status = 'siap'", [order.id, id]);
    if (!result.affectedRows) return NextResponse.json({ error: 'Pesanan belum siap diantar.' }, { status: 409 });
  } else {
    if (order.status !== 'diantar') return NextResponse.json({ error: 'Pesanan belum berstatus diantar.' }, { status: 409 });
    const [result] = await pool().query("UPDATE orders SET status = 'selesai', completed_at = COALESCE(completed_at, NOW()) WHERE id = ? AND courier_id = ? AND status = 'diantar'", [order.id, id]);
    if (!result.affectedRows) return NextResponse.json({ error: 'Pesanan belum berstatus diantar.' }, { status: 409 });
  }
  return NextResponse.json({ ok: true, order: await loadOrder(code, { seller: true }) });
}
