import { NextResponse } from 'next/server';
import { COURIER_COOKIE, courierPasswordOk, makeCourierToken } from '@/lib/courier-auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!courierPasswordOk(password)) return NextResponse.json({ error: 'Password kurir salah.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COURIER_COOKIE, makeCourierToken(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
  return res;
}
