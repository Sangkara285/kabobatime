import { NextResponse } from 'next/server';
import { getMenu } from '@/lib/menu';
import { getSettings, publicSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const [menu, s] = await Promise.all([getMenu(), getSettings()]);
    return NextResponse.json({ ...menu, settings: publicSettings(s) });
  } catch (e) {
    return NextResponse.json({ error: 'Menu belum bisa dimuat.' }, { status: 500 });
  }
}
