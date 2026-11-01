import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const NAME = 'kbt_courier';
const secret = () => process.env.SESSION_SECRET || 'dev-secret-ganti-di-produksi';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');

export function makeCourierToken() {
  const exp = String(Date.now() + 1000 * 60 * 60 * 24);
  return `${exp}.${sign(`courier:${exp}`)}`;
}

export function isCourierToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = sign(`courier:${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const isCourier = () => isCourierToken(cookies().get(NAME)?.value);
export const COURIER_COOKIE = NAME;

export function courierPasswordOk(password) {
  const real = process.env.COURIER_PASSWORD || '';
  if (!real) return false;
  const a = Buffer.from(String(password));
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
