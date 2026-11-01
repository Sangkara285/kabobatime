import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const COOKIE = 'kbt_kurir';
const secret = () => process.env.SESSION_SECRET || 'dev-secret-ganti-di-produksi';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const failures = new Map();

export function makeCourierToken(id) {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24);
  return `courier.${id}.${exp}.${sign(`courier:${id}:${exp}`)}`;
}
export function isCourierToken(token) {
  if (!token) return false;
  const [role, id, exp, sig] = token.split('.');
  if (role !== 'courier' || !id || !exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(`courier:${id}:${exp}`));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function courierId() {
  const token = cookies().get(COOKIE)?.value;
  if (!isCourierToken(token)) return null;
  return Number(token.split('.')[1]);
}
export const isKurir = () => courierId() !== null;
export const courierCookie = COOKIE;
export async function courierPasswordOk(username, password, find) {
  const key = String(username || '').trim().toLowerCase();
  const now = Date.now();
  const entry = failures.get(key);
  if (entry && entry.until > now && entry.count >= 5) return { ok: false, limited: true };
  const row = await find(key);
  const ok = row && row.active && await bcrypt.compare(String(password || ''), row.password_hash);
  if (!ok) {
    const next = entry && entry.until > now ? { count: entry.count + 1, until: entry.until } : { count: 1, until: now + 15 * 60 * 1000 };
    failures.set(key, next);
    return { ok: false, limited: next.count >= 5 };
  }
  failures.delete(key);
  return { ok: true, row };
}
export const hashCourierPassword = (password) => bcrypt.hash(String(password), 10);
