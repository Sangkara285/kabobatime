import { NextResponse } from 'next/server';
import { courierCookie, courierPasswordOk, makeCourierToken } from '@/lib/courier-auth';
import { pool } from '@/lib/db';

export async function POST(req) {
  const { username, password } = await req.json().catch(() => ({}));
  const result = await courierPasswordOk(username, password, async (key) => {
    const [[row]] = await pool().query('SELECT * FROM couriers WHERE username = ?', [key]);
    return row;
  });
  if (!result.ok) return NextResponse.json({ error: result.limited ? 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' : 'Username atau password kurir salah.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(courierCookie, makeCourierToken(result.row.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(courierCookie, '', { httpOnly: true, expires: new Date(0), path: '/' });
  return res;
}
