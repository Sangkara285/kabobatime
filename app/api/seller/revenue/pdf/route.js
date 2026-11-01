import PDFDocument from 'pdfkit';
import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
const businessDate = `(
  CASE WHEN TIME(o.created_at) < '16:00:00'
    THEN DATE_SUB(DATE(o.created_at), INTERVAL 1 DAY)
    ELSE DATE(o.created_at)
  END
) BETWEEN ? AND ?`;

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const money = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

export async function GET(req) {
  if (!isSeller()) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const from = params.get('dari') || '';
  const to = params.get('sampai') || '';
  if (!validDate(from) || !validDate(to)) return NextResponse.json({ error: 'Tanggal tidak valid.' }, { status: 400 });
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
  if (days < 1 || days > 366) return NextResponse.json({ error: 'Rentang tanggal harus 1 sampai 366 hari.' }, { status: 400 });

  const [orders] = await pool().query(
    `SELECT o.code, o.customer_name, o.payment, o.subtotal, o.discount_amount, o.fee, o.total, o.created_at,
            oi.name, oi.qty, oi.unit_price
     FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = 'selesai' AND ${businessDate}
     ORDER BY o.created_at, o.id, oi.id`,
    [from, to],
  );
  const grouped = [];
  for (const row of orders) {
    let order = grouped.find((x) => x.code === row.code);
    if (!order) {
      order = { ...row, items: [] };
      grouped.push(order);
    }
    if (row.name) order.items.push(row);
  }

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on('end', resolve));
  doc.fontSize(18).text('Rekap Pendapatan Kaboba Time');
  doc.fontSize(10).text(`Periode hari operasional: ${from} s/d ${to} (berganti pukul 16.00)`);
  doc.moveDown();
  const gross = grouped.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const discounts = grouped.reduce((sum, o) => sum + Number(o.discount_amount || 0), 0);
  const revenue = grouped.reduce((sum, o) => sum + Number(o.total || 0), 0);
  doc.fontSize(11).text(`Pesanan selesai: ${grouped.length}`);
  doc.text(`Pendapatan kotor: ${money(gross)}`);
  doc.text(`Diskon: ${money(discounts)}`);
  doc.text(`Pendapatan bersih: ${money(revenue)}`);
  doc.moveDown();
  grouped.forEach((o) => {
    doc.fontSize(11).text(`${o.code} · ${o.customer_name} · ${o.payment}`);
    doc.fontSize(9);
    o.items.forEach((item) => doc.text(`  ${item.qty}x ${item.name} = ${money(item.qty * item.unit_price)}`));
    doc.text(`  Subtotal ${money(o.subtotal)} · Diskon ${money(o.discount_amount)} · Ongkir ${money(o.fee)} · Total ${money(o.total)}`);
    doc.moveDown(0.5);
    if (doc.y > 750) doc.addPage();
  });
  doc.end();
  await done;
  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rekap-pendapatan-${from}-${to}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
