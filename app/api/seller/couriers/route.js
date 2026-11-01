import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { hashCourierPassword } from '@/lib/courier-auth';

const deny = () => NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
export async function GET() {
  if (!isSeller()) return deny();
  const [couriers] = await pool().query('SELECT id, name, username, phone, active, created_at FROM couriers ORDER BY name');
  return NextResponse.json({ couriers });
}
export async function POST(req) {
  if (!isSeller()) return deny();
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 80);
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!name || !/^[a-z0-9._-]{3,40}$/.test(username) || password.length < 8) return NextResponse.json({ error: 'Nama, username, dan password minimal 8 karakter wajib diisi.' }, { status: 400 });
  try {
    await pool().query('INSERT INTO couriers (name, username, password_hash, phone) VALUES (?,?,?,?)', [name, username, await hashCourierPassword(password), String(b.phone || '').trim().slice(0, 30) || null]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Akun kurir belum bisa dibuat.' }, { status: 500 });
  }
}
