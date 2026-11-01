import { flat } from './format';

const IMG_OK = /^(\/menu\/[a-z0-9._-]+\.(jpg|jpeg|png|webp)|\/api\/uploads\/[a-z0-9-]+\.(jpg|png|webp))$/i;

// Membersihkan dan memvalidasi input produk dari penjual. Mengembalikan { error } atau { data } (hanya field yang dikirim).
export function cleanProduct(b, { partial }) {
  const d = {};
  const has = (k) => b[k] !== undefined;
  if (has('name') || !partial) {
    const v = flat(b.name).slice(0, 160);
    if (!v) return { error: 'Nama produk wajib diisi.' };
    d.name = v;
  }
  if (has('price') || !partial) {
    const n = Number(b.price);
    if (!Number.isInteger(n) || n < 0 || n > 1000000) return { error: 'Harga harus angka bulat antara 0 dan 1.000.000.' };
    d.price = n;
  }
  if (has('category_id') || !partial) {
    const n = Number(b.category_id);
    if (!Number.isInteger(n) || n <= 0) return { error: 'Pilih kategori.' };
    d.category_id = n;
  }
  if (has('description')) d.description = String(b.description || '').trim().slice(0, 1000) || null;
  if (has('note_hint')) d.note_hint = flat(b.note_hint).slice(0, 160) || null;
  if (has('image')) {
    const v = b.image ? String(b.image) : '';
    if (v && !IMG_OK.test(v)) return { error: 'Alamat foto tidak valid.' };
    d.image = v || null;
  }
  for (const k of ['has_addons', 'is_addon', 'featured', 'available']) if (has(k)) d[k] = b[k] ? 1 : 0;
  if (has('sold_label')) d.sold_label = b.sold_label === 'kosong' ? 'kosong' : 'habis';
  if (has('sold_note')) d.sold_note = flat(b.sold_note).slice(0, 160) || null;
  if (d.is_addon) d.has_addons = 0;
  return { data: d };
}
