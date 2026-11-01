import { NextResponse } from 'next/server';
import { loadOrder, publicOrder, waUrl } from '@/lib/orders';
import { getSettings } from '@/lib/settings';
import { pool } from '@/lib/db';
import { TRACKING_EXPIRY_MINUTES } from '@/lib/config';
import { createRateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
const limitOrderLookups = createRateLimiter();
export async function GET(req, { params }) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rate = limitOrderLookups(ip, { limit: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfter), 'Cache-Control': 'no-store' } },
    );
  }

  const code = String(params.code).toUpperCase();
  const [[expired]] = await pool().query(
    `SELECT id FROM orders WHERE code = ? AND status = ? AND completed_at < NOW() - INTERVAL ${TRACKING_EXPIRY_MINUTES} MINUTE`,
    [code, 'selesai'],
  );
  if (expired) return NextResponse.json({ error: 'Halaman lacak pesanan ini sudah tidak tersedia.' }, { status: 410 });

  const order = await loadOrder(code);
  if (!order) {
    return NextResponse.json({ error: 'Kode order tidak ditemukan.' }, { status: 404 });
  }
  const s = await getSettings();
  const visibleOrder = publicOrder(order);
  return NextResponse.json({ order: visibleOrder, waUrl: waUrl(visibleOrder, s.wa_number) }, { headers: { 'Cache-Control': 'no-store' } });
}
