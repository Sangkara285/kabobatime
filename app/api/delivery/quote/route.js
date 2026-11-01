import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { quote } from '@/lib/delivery';

export const dynamic = 'force-dynamic';
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const q = await quote(await getSettings(), b, Math.max(0, Number(b.subtotal) || 0));
  if (!q.ok) return NextResponse.json({ error: q.error }, { status: 400 });
  return NextResponse.json(q);
}
