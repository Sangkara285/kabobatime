import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getAdminMenu, uniqueSlug } from '@/lib/menu';
import { cleanProduct } from '@/lib/product-input';

export const dynamic = 'force-dynamic';
const deny = () => NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });

export async function GET() {
  if (!isSeller()) return deny();
  return NextResponse.json(await getAdminMenu());
}

export async function POST(req) {
  if (!isSeller()) return deny();
  const b = await req.json().catch(() => ({}));
  const { error, data } = cleanProduct(b, { partial: false });
  if (error) return NextResponse.json({ error }, { status: 400 });
  const [[cat]] = await pool().query('SELECT id FROM categories WHERE id = ?', [data.category_id]);
  if (!cat) return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 400 });
  const slug = await uniqueSlug('products', data.name);
  const [[mx]] = await pool().query('SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM products WHERE category_id = ?', [data.category_id]);
  const row = { available: 1, sold_label: 'habis', has_addons: 0, is_addon: 0, featured: 0, ...data, slug, sort: mx.n };
  const cols = Object.keys(row);
  const [r] = await pool().query(`INSERT INTO products (${cols.map((c) => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => row[c]));
  return NextResponse.json({ ok: true, id: r.insertId });
}
