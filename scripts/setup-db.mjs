// Membuat database, tabel, migrasi kolom baru, dan menambahkan menu awal.
// Aman dijalankan berulang: tidak menghapus data, tidak menimpa perubahan penjual.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import mysql from 'mysql2/promise';

const require = createRequire(import.meta.url);
const seed = require('../lib/seed-data.js');

for (const f of ['.env.local', '.env']) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const e = process.env;
const dbName = e.MYSQL_DATABASE || 'kaboba_time';
const conn = await mysql.createConnection({
  host: e.MYSQL_HOST || '127.0.0.1', port: +(e.MYSQL_PORT || 3306),
  user: e.MYSQL_USER || 'root', password: e.MYSQL_PASSWORD || '', multipleStatements: true,
});
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
await conn.query(`USE \`${dbName}\``);
await conn.query(fs.readFileSync(path.resolve('db/schema.sql'), 'utf8'));

// Migrasi untuk database lama (tabel sudah ada tanpa kolom baru)
async function addColumn(table, column, ddl) {
  const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?', [dbName, table, column]);
  if (!r.n) { await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${ddl}`); console.log(`+ kolom ${table}.${column}`); }
}
await addColumn('products', 'featured', 'TINYINT(1) NOT NULL DEFAULT 0');
await addColumn('products', 'sold_label', "ENUM('habis','kosong') NOT NULL DEFAULT 'habis'");
await addColumn('products', 'sold_note', 'VARCHAR(160) NULL');
await addColumn('orders', 'lat', 'DECIMAL(9,6) NULL');
await addColumn('orders', 'lng', 'DECIMAL(9,6) NULL');
await addColumn('orders', 'distance_km', 'DECIMAL(5,2) NULL');
await addColumn('orders', 'distance_source', 'VARCHAR(12) NULL');
await addColumn('orders', 'payment_status', "ENUM('belum','menunggu','terverifikasi','ditolak') NOT NULL DEFAULT 'belum'");
await addColumn('orders', 'payment_proof', 'VARCHAR(255) NULL');
await addColumn('orders', 'payment_proof_at', 'DATETIME NULL');
await addColumn('orders', 'payment_reject_note', 'VARCHAR(160) NULL');
await addColumn('orders', 'completed_at', 'DATETIME NULL');
await addColumn('orders', 'wa_proof_at', 'DATETIME NULL');
await conn.query('ALTER TABLE categories MODIFY slug VARCHAR(80) NOT NULL');
await conn.query('ALTER TABLE products MODIFY slug VARCHAR(120) NOT NULL');

const catId = {};
for (const [i, c] of seed.categories.entries()) {
  await conn.query('INSERT INTO categories (slug,name,sort) VALUES (?,?,?) ON DUPLICATE KEY UPDATE slug=slug', [c.slug, c.name, i]);
  const [[row]] = await conn.query('SELECT id FROM categories WHERE slug=?', [c.slug]);
  catId[c.slug] = row.id;
}
let added = 0;
for (const [i, p] of seed.products.entries()) {
  const [r] = await conn.query(
    `INSERT IGNORE INTO products (category_id,slug,name,description,price,image,is_addon,has_addons,featured,note_hint,sort)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [catId[p.cat], p.slug, p.name, p.description || null, p.price, p.image || null, p.is_addon || 0, p.has_addons || 0, p.featured || 0, p.note_hint || null, i]);
  added += r.affectedRows;
}
console.log(`Selesai. Database "${dbName}" siap. Produk baru ditambahkan: ${added} dari ${seed.products.length}.`);
await conn.end();
