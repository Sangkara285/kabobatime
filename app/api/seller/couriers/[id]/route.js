import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { hashCourierPassword } from '@/lib/courier-auth';

const deny = () => NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
export async function PATCH(req, { params }) {
  if (!isSeller()) return deny();
  const b = await req.json().catch(() => ({}));
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Kurir tidak valid.' }, { status: 400 });
  if (b.active !== undefined) await pool().query('UPDATE couriers SET active = ? WHERE id = ?', [b.active ? 1 : 0, id]);
  if (b.password !== undefined) {
    if (String(b.password).length < 8) return NextResponse.json({ error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    await pool().query('UPDATE couriers SET password_hash = ? WHERE id = ?', [await hashCourierPassword(b.password), id]);
  }
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req, { params }) {
  if (!isSeller()) return deny();
  await pool().query('DELETE FROM couriers WHERE id = ?', [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
