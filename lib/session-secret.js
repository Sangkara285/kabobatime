import { randomBytes } from 'node:crypto';

const developmentSecret = randomBytes(32).toString('hex');
let warned = false;

export function sessionSecret() {
  const value = process.env.SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!value) throw new Error('SESSION_SECRET must be configured in production.');
    if (value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters in production.');
    return value;
  }

  if (value) return value;
  if (!warned) {
    console.warn('SESSION_SECRET is unset; using an ephemeral development-only secret.');
    warned = true;
  }
  return developmentSecret;
}
