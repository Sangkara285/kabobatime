import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const NAME = 'kbt_seller';
const secret = () => process.env.SESSION_SECRET || 'dev-secret-ganti-di-produksi';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export function makeToken() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24 * 7);
  return `${exp}.${sign(exp)}`;
}
export function verifyToken(t) {
  if (!t) return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
export const isSeller = () => verifyToken(cookies().get(NAME)?.value);
export const COOKIE = NAME;
export function passwordOk(pw) {
  const real = process.env.SELLER_PASSWORD || '';
  if (!real) return false;
  const a = Buffer.from(String(pw)), b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
