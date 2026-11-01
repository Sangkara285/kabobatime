import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { flat } from '@/lib/format';

const deny = () => NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });

export async function PATCH(req, { params }) {
  if (!isSeller()) return deny();
  const id = +params.id;
  const b = await req.json().catch(() => ({}));
  const [[cur]] = await pool().query('SELECT id FROM categories WHERE id = ?', [id]);
  if (!cur) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });

  if (b.move === 'up' || b.move === 'down') {
    const [rows] = await pool().query('SELECT id FROM categories ORDER BY sort, id');
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id), j = b.move === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < ids.length) {
      [ids[i], ids[j]] = [ids[j], ids[i]];
      for (const [n, cid] of ids.entries()) await pool().query('UPDATE categories SET sort = ? WHERE id = ?', [n, cid]);
    }
    return NextResponse.json({ ok: true });
  }
  const name = flat(b.name).slice(0, 120);
  if (!name) return NextResponse.json({ error: 'Nama kategori wajib diisi.' }, { status: 400 });
  await pool().query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  if (!isSeller()) return deny();
  const id = +params.id;
  const [[n]] = await pool().query('SELECT COUNT(*) AS n FROM products WHERE category_id = ?', [id]);
  if (n.n) return NextResponse.json({ error: `Kategori masih berisi ${n.n} produk. Pindahkan atau hapus produknya dulu.` }, { status: 409 });
  await pool().query('DELETE FROM categories WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
