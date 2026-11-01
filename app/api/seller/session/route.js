import { NextResponse } from 'next/server';
import { isSeller } from '@/lib/auth';
import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'no-store' };

// Dipakai tombol "Dashboard penjual" di halaman pembeli. Pembeli biasa hanya menerima loggedIn: false.
export async function GET() {
  if (!isSeller()) return NextResponse.json({ loggedIn: false, newOrders: 0 }, { headers: NO_STORE });
  const [[r]] = await pool().query("SELECT COUNT(*) AS n FROM orders WHERE status = 'baru'");
  return NextResponse.json({ loggedIn: true, newOrders: Number(r.n) }, { headers: NO_STORE });
}
