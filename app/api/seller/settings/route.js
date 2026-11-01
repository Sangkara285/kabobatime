import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
const deny = () => NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });

export async function GET() {
  if (!isSeller()) return deny();
  return NextResponse.json(await getSettings());
}
export async function PUT(req) {
  if (!isSeller()) return deny();
  const b = await req.json().catch(() => ({}));
  return NextResponse.json(await saveSettings(b));
}
