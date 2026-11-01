import { isSeller } from '@/lib/auth';
import { FILE_RE, TYPES, readProof } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

// Bukti pembayaran hanya bisa dibuka penjual yang sudah masuk.
export async function GET(_req, { params }) {
  if (!isSeller()) return new Response('Belum masuk.', { status: 401 });
  const f = String(params.file);
  if (!FILE_RE.test(f)) return new Response('Tidak ditemukan.', { status: 404 });
  const buf = await readProof(f);
  if (!buf) return new Response('Tidak ditemukan.', { status: 404 });
  return new Response(buf, {
    headers: { 'Content-Type': TYPES[f.split('.').pop()], 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
