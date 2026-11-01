import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { MAX_BYTES, saveUpload, sniff } from '@/lib/uploads';

export async function POST(req) {
  if (!isSeller()) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 });
  let file;
  try { file = (await req.formData()).get('file'); } catch { return NextResponse.json({ error: 'File tidak terbaca.' }, { status: 400 }); }
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') return NextResponse.json({ error: 'Pilih file foto.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Foto terlalu besar. Maksimal 4 MB.' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf);
  if (!ext) return NextResponse.json({ error: 'Format foto harus JPG, PNG, atau WebP.' }, { status: 400 });
  return NextResponse.json({ url: await saveUpload(buf, ext) });
}
