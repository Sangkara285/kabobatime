import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
export const PROOF_DIR = path.join(UPLOAD_DIR, 'proofs');
export const MAX_BYTES = 4 * 1024 * 1024;
export const FILE_RE = /^[a-z0-9-]+\.(jpg|png|webp)$/;
export const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

// Tentukan jenis gambar dari isi file, bukan dari nama atau header yang dikirim pengguna.
export function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

const newName = (ext) => `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

// Foto produk (publik).
export async function saveUpload(buf, ext) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = newName(ext);
  await fs.writeFile(path.join(UPLOAD_DIR, name), buf);
  return `/api/uploads/${name}`;
}

// Hapus file upload lama bila fotonya berasal dari upload (bukan foto bawaan di /public).
export async function removeUpload(url) {
  const m = /^\/api\/uploads\/([a-z0-9-]+\.(?:jpg|png|webp))$/.exec(url || '');
  if (!m) return;
  try { await fs.unlink(path.join(UPLOAD_DIR, m[1])); } catch { /* sudah tidak ada */ }
}

// Bukti pembayaran (privat): disimpan di uploads/proofs dan hanya bisa dibaca penjual lewat API.
export async function saveProof(buf, ext) {
  await fs.mkdir(PROOF_DIR, { recursive: true });
  const name = newName(ext);
  await fs.writeFile(path.join(PROOF_DIR, name), buf);
  return name;
}

export async function removeProof(name) {
  if (!name || !FILE_RE.test(name)) return;
  try { await fs.unlink(path.join(PROOF_DIR, name)); } catch { /* sudah tidak ada */ }
}

export async function readProof(name) {
  if (!FILE_RE.test(name)) return null;
  try { return await fs.readFile(path.join(PROOF_DIR, name)); } catch { return null; }
}
