'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function CourierLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const r = await fetch('/api/kurir/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(data.error || 'Gagal masuk.'); return; }
    router.refresh();
  }
  return <div className="mx-auto max-w-sm px-4 py-12"><div className="mb-3 flex justify-end"><ThemeToggle /></div><form onSubmit={submit} className="card space-y-4 p-6"><img src="/logo.jpg" alt="" className="h-14 w-14 rounded-full" /><h1 className="text-2xl font-extrabold">Masuk kurir</h1><label className="block font-semibold">Username<input className="field mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label><label className="block font-semibold">Password<input type="password" className="field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <p role="alert" className="text-warn-text">{error}</p>}<button className="btn w-full" disabled={busy || !username || !password}>{busy ? 'Memeriksa…' : 'Masuk'}</button><a href="/" className="block text-center text-sm font-semibold text-ink-2">← Kembali ke toko</a></form></div>;
}
