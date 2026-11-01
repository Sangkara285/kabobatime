import { createHash } from 'node:crypto';

const state = globalThis;
if (!state.__kabobaDevelopmentSecret) {
  state.__kabobaDevelopmentSecret = createHash('sha256').update('kaboba-time-development-only-fallback').digest('hex');
}

export function sessionSecret() {
  const value = process.env.SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!value) throw new Error('SESSION_SECRET must be configured in production.');
    if (value.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters in production.');
    return value;
  }

  if (value) return value;
  if (!state.__kabobaDevelopmentSecretWarning) {
    console.warn('SESSION_SECRET is unset; using a development-only fallback.');
    state.__kabobaDevelopmentSecretWarning = true;
  }
  return state.__kabobaDevelopmentSecret;
}
