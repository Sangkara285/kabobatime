import { pool } from './db';

// Pengaturan toko. Nilai awal dari .env, bisa diubah penjual di /penjual > Pengaturan (disimpan di tabel settings).
const KEYS = ['outlet_lat', 'outlet_lng', 'fee_per_km', 'max_km', 'free_above', 'wa_number', 'open_hours'];

function defaults() {
  const e = process.env;
  return {
    outlet_lat: Number(e.OUTLET_LAT || -6.3225),
    outlet_lng: Number(e.OUTLET_LNG || 107.4395),
    fee_per_km: Number(e.DELIVERY_FEE_PER_KM || 1000),
    max_km: Number(e.DELIVERY_MAX_KM || 10),
    free_above: Number(e.FREE_DELIVERY_ABOVE || 0),
    wa_number: String(e.WA_NUMBER || '6288299612231').replace(/\D/g, ''),
    open_hours: e.OPEN_HOURS || '',
  };
}

export async function getSettings() {
  const d = defaults();
  try {
    const [rows] = await pool().query('SELECT k, v FROM settings');
    for (const r of rows) {
      if (!KEYS.includes(r.k)) continue;
      d[r.k] = ['wa_number', 'open_hours'].includes(r.k) ? r.v : Number(r.v);
    }
  } catch (e) { /* tabel belum ada: pakai default */ }
  return d;
}

export async function saveSettings(input) {
  const out = {};
  const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  const c = {
    outlet_lat: num(input.outlet_lat, -90, 90), outlet_lng: num(input.outlet_lng, -180, 180),
    fee_per_km: num(input.fee_per_km, 0, 100000), max_km: num(input.max_km, 1, 100), free_above: num(input.free_above, 0, 10000000),
  };
  for (const [k, v] of Object.entries(c)) if (v !== null && input[k] !== undefined) out[k] = String(v);
  if (typeof input.wa_number === 'string') { const w = input.wa_number.replace(/\D/g, ''); if (w.length >= 9 && w.length <= 15) out.wa_number = w; }
  if (typeof input.open_hours === 'string') out.open_hours = input.open_hours.trim().slice(0, 60) || ' ';
  for (const [k, v] of Object.entries(out))
    await pool().query('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, v]);
  return getSettings();
}

// Info yang boleh dilihat publik
export const publicSettings = (s) => ({ fee_per_km: s.fee_per_km, max_km: s.max_km, free_above: s.free_above, open_hours: (s.open_hours || '').trim(), outlet: { lat: s.outlet_lat, lng: s.outlet_lng } });
