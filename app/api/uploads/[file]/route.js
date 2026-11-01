import fs from 'node:fs/promises';
import path from 'node:path';
import { FILE_RE, TYPES, UPLOAD_DIR } from '@/lib/uploads';

export async function GET(_req, { params }) {
  const f = String(params.file);
  if (!FILE_RE.test(f)) return new Response('Not found', { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, f));
    return new Response(buf, { headers: { 'Content-Type': TYPES[f.split('.').pop()], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
