import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { MAX_BYTES, removeProof, saveProof, sniff } from '@/lib/uploads';

export const dynamic = 'force-dynamic';
const bad = (error, status = 400) => NextResponse.json({ error }, { status });

// Pembeli mengunggah bukti transfer atau foto pembayaran QRIS untuk pesanannya.
export async function POST(req, { params }) {
  try {
    const code = String(params.code).toUpperCase();
    const [[o]] = await pool().query('SELECT id, status, payment, payment_status, payment_proof FROM orders WHERE code = ?', [code]);
    if (!o) return bad('Kode order tidak ditemukan.', 404);
    if (o.status === 'batal') return bad('Pesanan ini sudah dibatalkan.', 409);
    if (!['QRIS', 'Transfer'].includes(o.payment)) return bad('Pesanan ini dibayar tunai, jadi tidak perlu bukti pembayaran.', 400);
    if (o.payment_status === 'terverifikasi') return bad('Pembayaran pesanan ini sudah terverifikasi.', 409);

    let file;
    try { file = (await req.formData()).get('file'); } catch { return bad('Foto tidak terbaca. Pilih ulang fotonya lalu coba lagi.'); }
    if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return bad('Pilih foto bukti pembayaran dulu.');
    if (file.size > MAX_BYTES) return bad('Foto terlalu besar. Maksimal 4 MB.');

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = sniff(buf);
    if (!ext) return bad('Format foto harus JPG, PNG, atau WebP.');

    const name = await saveProof(buf, ext);
    await pool().query(
      "UPDATE orders SET payment_proof = ?, payment_status = 'menunggu', payment_proof_at = NOW(), payment_reject_note = NULL WHERE id = ?",
      [name, o.id],
    );
    await removeProof(o.payment_proof);
    return NextResponse.json({ ok: true, paymentStatus: 'menunggu' });
  } catch (e) {
    console.error(e);
    return bad('Bukti belum bisa disimpan. Coba lagi sebentar.', 500);
  }
}
