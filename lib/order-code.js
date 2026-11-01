import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function genCode() {
  let suffix = '';
  for (let i = 0; i < 8; i += 1) suffix += ALPHABET[randomInt(ALPHABET.length)];
  const date = new Date();
  const dayMonth = String(date.getDate()).padStart(2, '0') + String(date.getMonth() + 1).padStart(2, '0');
  return `KBT-${dayMonth}-${suffix}`;
}
