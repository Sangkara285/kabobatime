import { NextResponse } from 'next/server';
import { COOKIE, makeToken, passwordOk } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const failedLogins = createRateLimiter();
export async function POST(req) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limit = { limit: 5, windowMs: 15 * 60_000 };
  if (!failedLogins.peek(ip, limit).allowed) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }, { status: 429 });
  }
  const { password } = await req.json().catch(() => ({}));
  if (!passwordOk(password)) {
    const result = failedLogins(ip, limit);
    return NextResponse.json(
      { error: result.allowed ? 'Password salah.' : 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: result.allowed ? 401 : 429 },
    );
  }
  failedLogins.reset(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
