import { NextResponse } from 'next/server';
import { clearCourierCookie, courierId } from '@/lib/courier-auth';
import { pool } from '@/lib/db';
import { shape, mapsUrl } from '@/lib/orders';

export const dynamic = 'force-dynamic';
export async function GET() {
  const id = await courierId();
  if (id === null) return clearCourierCookie(NextResponse.json({ error: 'Belum masuk.' }, { status: 401 }));
  const [orders] = await pool().query("SELECT o.*, c.name AS courier_name FROM orders o LEFT JOIN couriers c ON c.id = o.courier_id WHERE o.mode = 'antar' AND o.status IN ('siap','diantar','diproses') AND o.courier_id = ? ORDER BY o.ready_at IS NULL ASC, o.ready_at ASC, o.accepted_at ASC LIMIT 100", [id]);
  if (!orders.length) return NextResponse.json({ orders: [] });
  const [items] = await pool().query('SELECT order_id, name, unit_price, qty, addons, note FROM order_items WHERE order_id IN (?) ORDER BY id', [orders.map((o) => o.id)]);
  return NextResponse.json({ orders: orders.map((o) => ({ ...shape(o, items.filter((i) => i.order_id === o.id)), mapsUrl: mapsUrl(o), courierName: o.courier_name })) });
}
