import { NextResponse } from 'next/server';
import { loadOrder, waUrl, mapsUrl } from '@/lib/orders';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export async function GET(_req, { params }) {
  const order = await loadOrder(String(params.code).toUpperCase());
  if (!order) return NextResponse.json({ error: 'Kode order tidak ditemukan.' }, { status: 404 });
  const s = await getSettings();
  return NextResponse.json({ order, waUrl: waUrl(order, s.wa_number), mapsUrl: mapsUrl(order) });
}
