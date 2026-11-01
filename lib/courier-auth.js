import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { pool } from './db';
import { sessionSecret } from './session-secret';

const COOKIE = 'kbt_kurir';
const sign = (v) => crypto.createHmac('sha256', sessionSecret()).update(v).digest('hex');
const failures = new Map();

export function makeCourierToken(id) {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24);
  return `kurir.${id}.${exp}.${sign(`kurir:${id}:${exp}`)}`;
}
export function isCourierToken(token) {
  if (!token) return false;
  const [role, id, exp, sig] = token.split('.');
  if (role !== 'kurir' || !id || !exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(`kurir:${id}:${exp}`));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export async function courierId() {
  const token = cookies().get(COOKIE)?.value;
  if (!isCourierToken(token)) return null;
  const id = Number(token.split('.')[1]);
  const [[courier]] = await pool().query('SELECT active FROM couriers WHERE id = ?', [id]);
  return courier?.active ? id : null;
}
export async function isKurir() {
  return (await courierId()) !== null;
}
export const courierCookie = COOKIE;
export function clearCourierCookie(response) {
  response.cookies.set(COOKIE, '', { httpOnly: true, expires: new Date(0), path: '/' });
  return response;
}
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
