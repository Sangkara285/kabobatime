import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { uniqueSlug } from '@/lib/menu';
import { flat } from '@/lib/format';

export async function POST(req) {
  if (!isSeller()) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const name = flat(b.name).slice(0, 120);
  if (!name) return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 });
  const [[mx]] = await pool().query('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM categories');
  const [r] = await pool().query('INSERT INTO categories (slug, name, sort) VALUES (?,?,?)', [await uniqueSlug('categories', name), name, mx.n]);
  return NextResponse.json({ ok: true, id: r.insertId });
}
