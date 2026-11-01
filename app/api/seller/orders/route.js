import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { shape } from '@/lib/orders';

export const dynamic = 'force-dynamic';
export async function GET() {
  if (!isSeller()) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const [orders] = await pool().query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  if (!orders.length) return NextResponse.json({ orders: [] }, { headers: { 'Cache-Control': 'no-store' } });
  const [items] = await pool().query('SELECT order_id, name, unit_price, qty, addons, note FROM order_items WHERE order_id IN (?) ORDER BY id', [orders.map((o) => o.id)]);
  return NextResponse.json(
    { orders: orders.map((o) => shape(o, items.filter((i) => i.order_id === o.id), { seller: true })) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
