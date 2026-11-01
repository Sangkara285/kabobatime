import test from 'node:test';
import assert from 'node:assert/strict';
import { genCode } from '../lib/order-code.js';
import { publicOrder } from '../lib/order-public.js';
import { createRateLimiter } from '../lib/rate-limit.js';
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
