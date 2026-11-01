import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { cleanProduct } from '@/lib/product-input';
import { removeUpload } from '@/lib/uploads';

const deny = () => NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });

export async function PATCH(req, { params }) {
  if (!isSeller()) return deny();
  const id = +params.id;
  const b = await req.json().catch(() => ({}));
  const [[cur]] = await pool().query('SELECT id, image, category_id FROM products WHERE id = ?', [id]);
  if (!cur) return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });

  // Pindah urutan naik/turun di dalam kategorinya
  if (b.move === 'up' || b.move === 'down') {
    const [rows] = await pool().query('SELECT id FROM products WHERE category_id = ? ORDER BY sort, id', [cur.category_id]);
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id), j = b.move === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < ids.length) {
      [ids[i], ids[j]] = [ids[j], ids[i]];
      for (const [n, pid] of ids.entries()) await pool().query('UPDATE products SET sort = ? WHERE id = ?', [n, pid]);
    }
    return NextResponse.json({ ok: true });
  }

  const { error, data } = cleanProduct(b, { partial: true });
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (data.category_id) {
    const [[cat]] = await pool().query('SELECT id FROM categories WHERE id = ?', [data.category_id]);
    if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 400 });
  }
  const cols = Object.keys(data);
  if (!cols.length) return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 });
  await pool().query(`UPDATE products SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => data[c]), id]);
  if ('image' in data && cur.image && cur.image !== data.image) await removeUpload(cur.image);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req, { params }) {
  if (!isSeller()) return deny();
  const id = +params.id;
  const [[cur]] = await pool().query('SELECT image FROM products WHERE id = ?', [id]);
  if (!cur) return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
  // Riwayat pesanan aman: order_items menyimpan nama dan harga saat dipesan.
  await pool().query('DELETE FROM products WHERE id = ?', [id]);
  if (cur.image) await removeUpload(cur.image);
  return NextResponse.json({ ok: true });
}
