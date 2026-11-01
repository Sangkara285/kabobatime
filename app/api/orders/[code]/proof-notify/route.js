import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  const code = String(params.code).toUpperCase();
  const [[order]] = await pool().query('SELECT id, payment_proof FROM orders WHERE code = ?', [code]);
  if (!order) return NextResponse.json({ error: 'Kode order tidak ditemukan.' }, { status: 404 });
  if (!order.payment_proof) return NextResponse.json({ error: 'Bukti pembayaran belum dikirim ke website.' }, { status: 409 });
  await pool().query('UPDATE orders SET wa_proof_at = NOW() WHERE id = ?', [order.id]);
  return NextResponse.json({ ok: true });
}
