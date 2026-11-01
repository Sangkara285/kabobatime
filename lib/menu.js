import { pool } from './db';

const COLS = `id, category_id, slug, name, description, price, image, is_addon, has_addons, featured, note_hint, available, sold_label, sold_note, sort`;
const bool = (p) => ({ ...p, is_addon: !!p.is_addon, has_addons: !!p.has_addons, featured: !!p.featured, available: !!p.available });

// Menu untuk pelanggan: produk habis TETAP tampil (dengan label Habis/Kosong) supaya pelanggan tahu.
// Topping ekstra (is_addon) tidak tampil sebagai kartu sendiri, hanya sebagai pilihan di kebab.
export async function getMenu() {
  const [cats] = await pool().query('SELECT id, slug, name FROM categories ORDER BY sort, id');
  const [prods] = await pool().query(`SELECT ${COLS} FROM products ORDER BY sort, id`);
  const all = prods.map(bool);
  const cards = all.filter((p) => !p.is_addon);
  return {
    categories: cats.map((c) => ({ ...c, products: cards.filter((p) => p.category_id === c.id) })).filter((c) => c.products.length),
    addons: all.filter((p) => p.is_addon && p.available),
    featured: cards.filter((p) => p.featured),
  };
}

// Menu untuk penjual: semua kategori (termasuk kosong) dan semua produk.
export async function getAdminMenu() {
  const [cats] = await pool().query('SELECT id, slug, name, sort FROM categories ORDER BY sort, id');
  const [prods] = await pool().query(`SELECT ${COLS} FROM products ORDER BY sort, id`);
  const all = prods.map(bool);
  return { categories: cats.map((c) => ({ ...c, products: all.filter((p) => p.category_id === c.id) })) };
}

export async function uniqueSlug(table, name) {
  const base = String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const [[r]] = await pool().query(`SELECT COUNT(*) AS n FROM \`${table}\` WHERE slug = ?`, [slug]);
    if (!r.n) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}
