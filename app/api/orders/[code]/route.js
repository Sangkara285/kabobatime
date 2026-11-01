import { NextResponse } from 'next/server';
import { loadOrder, waUrl, mapsUrl } from '@/lib/orders';
import { getSettings } from '@/lib/settings';
import { pool } from '@/lib/db';
import { TRACKING_EXPIRY_MINUTES } from '@/lib/config';

export const dynamic = 'force-dynamic';
export async function GET(_req, { params }) {
  const code = String(params.code).toUpperCase();
  const order = await loadOrder(code);
  if (!order) {
    const [[expired]] = await pool().query(
      `SELECT id FROM orders WHERE code = ? AND status = ? AND completed_at < NOW() - INTERVAL ${TRACKING_EXPIRY_MINUTES} MINUTE`,
      [code, 'selesai'],
    );
    if (expired) return NextResponse.json({ error: 'Halaman lacak pesanan ini sudah tidak tersedia.' }, { status: 410 });
    return NextResponse.json({ error: 'Kode order tidak ditemukan.' }, { status: 404 });
  }
  const s = await getSettings();
  return NextResponse.json({ order, waUrl: waUrl(order, s.wa_number), mapsUrl: mapsUrl(order) });
}
