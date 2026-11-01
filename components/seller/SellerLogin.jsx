'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './shared';
import ThemeToggle from '@/components/ThemeToggle';

export default function SellerLogin() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function go(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const r = await api('/api/seller/login', 'POST', { password: pw });
    setBusy(false);
    if (r.ok) router.refresh();
    else setErr(r.data.error || 'Password salah.');
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-3 flex justify-end"><ThemeToggle /></div>
      <form onSubmit={go} className="card space-y-4 p-6">
        <img src="/logo.jpg" alt="" className="h-14 w-14 rounded-full" />
        <h1 className="text-2xl font-extrabold">Masuk penjual</h1>
        <div>
          <label htmlFor="pw" className="mb-1.5 block font-semibold">Password</label>
          <input id="pw" type="password" className="field" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          {err && <p role="alert" className="mt-1 text-sm text-warn-text">{err}</p>}
        </div>
        <button className="btn" disabled={busy || !pw}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
        <a href="/" className="block text-center text-sm font-semibold text-ink-2 hover:underline">← Kembali ke toko</a>
      </form>
    </div>
  );
}
