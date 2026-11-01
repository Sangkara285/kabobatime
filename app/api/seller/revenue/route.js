import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };
const bad = (error) => NextResponse.json({ error }, { status: 400, headers: NO_STORE });
const asMoney = (value) => Number(value || 0);

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export async function GET(req) {
  if (!isSeller()) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401, headers: NO_STORE });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('dari') || '';
  const to = searchParams.get('sampai') || '';
  if (!validDate(from) || !validDate(to)) return bad('Tanggal harus berformat YYYY-MM-DD dan valid.');
  const fromMs = Date.parse(`${from}T00:00:00Z`);
  const toMs = Date.parse(`${to}T00:00:00Z`);
  const days = Math.floor((toMs - fromMs) / 86400000) + 1;
  if (days < 1) return bad('Tanggal awal tidak boleh setelah tanggal akhir.');
  if (days > 366) return bad('Rentang tanggal maksimal 366 hari.');

  const db = pool();
  const range = `(
    CASE WHEN TIME(created_at) < '16:00:00'
      THEN DATE_SUB(DATE(created_at), INTERVAL 1 DAY)
      ELSE DATE(created_at)
    END
  ) BETWEEN ? AND ?`;
  const [summaryRows] = await db.query(
    `SELECT
       COUNT(*) AS total_orders,
       COALESCE(SUM(status = 'selesai'), 0) AS completed_orders,
       COALESCE(SUM(status IN ('baru', 'diproses', 'siap')), 0) AS running_orders,
       COALESCE(SUM(status = 'batal'), 0) AS cancelled_orders,
       COALESCE(SUM(CASE WHEN status = 'selesai' THEN subtotal ELSE 0 END), 0) AS gross_revenue,
       COALESCE(SUM(CASE WHEN status = 'selesai' THEN discount_amount ELSE 0 END), 0) AS discounts,
       COALESCE(SUM(CASE WHEN status = 'selesai' THEN total ELSE 0 END), 0) AS revenue
     FROM orders WHERE ${range}`,
    [from, to],
  );
  const [dailyRows] = await db.query(
    `SELECT DATE_FORMAT(CASE WHEN TIME(created_at) < '16:00:00' THEN DATE_SUB(DATE(created_at), INTERVAL 1 DAY) ELSE DATE(created_at) END, '%Y-%m-%d') AS date,
       COUNT(*) AS orders, COALESCE(SUM(subtotal), 0) AS gross_revenue, COALESCE(SUM(discount_amount), 0) AS discounts, COALESCE(SUM(total), 0) AS revenue
     FROM orders WHERE status = 'selesai' AND ${range}
     GROUP BY CASE WHEN TIME(created_at) < '16:00:00' THEN DATE_SUB(DATE(created_at), INTERVAL 1 DAY) ELSE DATE(created_at) END ORDER BY date`,
    [from, to],
  );
  const [paymentRows] = await db.query(
    `SELECT payment, COUNT(*) AS orders, COALESCE(SUM(subtotal), 0) AS gross_revenue, COALESCE(SUM(discount_amount), 0) AS discounts, COALESCE(SUM(total), 0) AS revenue
     FROM orders WHERE status = 'selesai' AND ${range}
     GROUP BY payment ORDER BY revenue DESC`,
    [from, to],
  );
  const [productRows] = await db.query(
    `SELECT oi.name, SUM(oi.qty) AS quantity, COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status = 'selesai' AND ${range}
     GROUP BY oi.name ORDER BY quantity DESC, revenue DESC LIMIT 10`,
    [from, to],
  );
  const [hourRows] = await db.query(
    `SELECT HOUR(created_at) AS hour, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
     FROM orders WHERE status = 'selesai' AND ${range}
     GROUP BY HOUR(created_at) ORDER BY orders DESC, revenue DESC`,
    [from, to],
  );
  const s = summaryRows[0] || {};
  return NextResponse.json({
    from, to,
    summary: {
      revenue: asMoney(s.revenue),
      grossRevenue: asMoney(s.gross_revenue),
      discounts: asMoney(s.discounts),
      completedOrders: Number(s.completed_orders || 0),
      runningOrders: Number(s.running_orders || 0),
      cancelledOrders: Number(s.cancelled_orders || 0),
      totalOrders: Number(s.total_orders || 0),
    },
    daily: dailyRows.map((r) => ({ date: r.date, orders: Number(r.orders), grossRevenue: asMoney(r.gross_revenue), discounts: asMoney(r.discounts), revenue: asMoney(r.revenue) })),
    paymentMethods: paymentRows.map((r) => ({ payment: r.payment, orders: Number(r.orders), grossRevenue: asMoney(r.gross_revenue), discounts: asMoney(r.discounts), revenue: asMoney(r.revenue) })),
    topProducts: productRows.map((r) => ({ name: r.name, quantity: Number(r.quantity), revenue: asMoney(r.revenue) })),
    busyHours: hourRows.map((r) => ({ hour: Number(r.hour), orders: Number(r.orders), revenue: asMoney(r.revenue) })),
  }, { headers: NO_STORE });
}
