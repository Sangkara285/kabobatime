import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { genCode } from '../lib/order-code.js';
import { publicOrder } from '../lib/order-public.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import { sessionSecret } from '../lib/session-secret.js';
import {
  cashAmountError,
  courierAssignmentError,
  courierIsActive,
  sellerStatusError,
  trackingExpired,
} from '../lib/order-rules.js';

test('tracking expires after ten minutes but not before', () => {
  assert.equal(trackingExpired('selesai', 1000, 1601, 10), true);
  assert.equal(trackingExpired('selesai', 1000, 1600, 10), false);
  assert.equal(trackingExpired('siap', 1000, 2000, 10), false);
  assert.equal(trackingExpired('selesai', null, 2000, 10), false);
});

test('order codes use eight unambiguous random characters', () => {
  const code = genCode();
  assert.match(code, /^KBT-\d{4}-[A-HJ-NP-Z2-9]{8}$/);
});

test('public order data omits phone, full address, and coordinates', () => {
  const order = publicOrder({
    code: 'KBT-0101-ABCDEFGH',
    name: 'Siti Aminah',
    phone: '08123456789',
    address: 'Jalan Rahasia 1',
    lat: -6.3,
    lng: 107.4,
    courierId: 3,
    proofUrl: '/private-proof',
    note: 'catatan pribadi',
    status: 'baru',
    total: 16000,
    items: [],
  });
  assert.equal(order.name, 'Siti');
  for (const key of ['phone', 'address', 'lat', 'lng', 'courierId', 'proofUrl', 'note']) {
    assert.equal(Object.hasOwn(order, key), false);
  }
});

test('public tracking rate limit allows thirty requests and blocks the next', () => {
  const limit = createRateLimiter();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    assert.equal(limit('client', { limit: 30, windowMs: 60000, now: 1000 }).allowed, true);
  }
  assert.equal(limit('client', { limit: 30, windowMs: 60000, now: 1001 }).allowed, false);
});

test('seller login limit blocks after five failures and clears after success', () => {
  const limit = createRateLimiter();
  const config = { limit: 5, windowMs: 15 * 60_000, now: 1000 };
  for (let failure = 0; failure < 5; failure += 1) {
    assert.equal(limit.peek('client', config).allowed, true);
    assert.equal(limit('client', config).allowed, true);
  }
  assert.equal(limit.peek('client', config).allowed, false);
  limit.reset('client');
  assert.equal(limit.peek('client', config).allowed, true);
});

test('seller cannot mark delivery orders complete or set in-delivery status', () => {
  assert.deepEqual(sellerStatusError('antar', 'selesai'), {
    status: 409,
    message: 'Pesanan antar diselesaikan oleh kurir.',
  });
  assert.equal(sellerStatusError('ambil', 'selesai'), null);
  assert.equal(sellerStatusError('ambil', 'diantar').status, 400);
});

test('courier assignment is rejected while a new order is pending', () => {
  assert.equal(courierAssignmentError('baru').status, 400);
  assert.equal(courierAssignmentError('diproses'), null);
});

test('cash payment rejects amounts below the order total', () => {
  assert.match(cashAmountError('Tunai', 10000, 16000), /minimal 16000/);
  assert.equal(cashAmountError('Tunai', null, 16000), null);
});

test('inactive courier accounts are treated as unauthenticated', () => {
  assert.equal(courierIsActive({ active: 0 }), false);
  assert.equal(courierIsActive({ active: 1 }), true);
  assert.equal(courierIsActive(null), false);
});

test('production sessions require a configured secret of at least 32 characters', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousSecret = process.env.SESSION_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.SESSION_SECRET;
    assert.throws(() => sessionSecret(), /configured in production/);
    process.env.SESSION_SECRET = 'short';
    assert.throws(() => sessionSecret(), /at least 32 characters/);
    process.env.SESSION_SECRET = randomBytes(32).toString('hex');
    assert.doesNotThrow(() => sessionSecret());
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});

test('development session fallback is stable and warns only once', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const previousSecret = process.env.SESSION_SECRET;
  const originalWarn = console.warn;
  const warnings = [];
  try {
    process.env.NODE_ENV = 'development';
    delete process.env.SESSION_SECRET;
    delete globalThis.__kabobaDevelopmentSecretWarning;
    console.warn = (message) => warnings.push(message);
    const first = sessionSecret();
    const second = sessionSecret();
    assert.equal(first, second);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = originalWarn;
    delete globalThis.__kabobaDevelopmentSecretWarning;
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});
