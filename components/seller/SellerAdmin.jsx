'use client';
import { useCallback, useEffect, useState } from 'react';
import { rp } from '@/lib/format';
import ProductImage from '@/components/ProductImage';
import { api, soldWord } from './shared';

/* ----------------------------------------------------------------- Produk */
const EMPTY = { id: null, name: '', category_id: '', price: '', description: '', image: '', has_addons: false, is_addon: false, featured: false, note_hint: '', available: true, sold_label: 'habis', sold_note: '' };

export function ProductsAdmin({ notify }) {
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [onlySold, setOnlySold] = useState(false);
  const [form, setForm] = useState(null);
  const [soldFor, setSoldFor] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api('/api/seller/products'); if (r.ok) setData(r.data); }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="text-ink-2">Memuat produk…</p>;
  const all = data.categories.flatMap((c) => c.products);
  const sold = all.filter((p) => !p.available);
  const s = q.trim().toLowerCase();

  async function patch(id, body, msg) {
    setBusy(true);
    const r = await api('/api/seller/products/' + id, 'PATCH', body);
    setBusy(false);
    if (!r.ok) { notify(r.data.error || 'Gagal menyimpan.'); return false; }
    if (msg) notify(msg);
    await load();
    return true;
  }
  async function del(p) {
    setBusy(true);
    const r = await api('/api/seller/products/' + p.id, 'DELETE');
    setBusy(false);
    setDelFor(null);
    if (!r.ok) { notify(r.data.error || 'Gagal menghapus.'); return; }
    notify(`${p.name} dihapus`);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-sm" onClick={() => setForm({ ...EMPTY, category_id: data.categories[0]?.id ?? '' })} disabled={!data.categories.length}>+ Tambah produk</button>
        <label className="sr-only" htmlFor="cari-produk">Cari produk</label>
        <input id="cari-produk" className="field max-w-xs" placeholder="Cari produk" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-[#B85306]" checked={onlySold} onChange={(e) => setOnlySold(e.target.checked)} />Hanya yang habis
        </label>
        <span className="text-sm text-ink-2">{all.length} produk</span>
      </div>
      {!data.categories.length && <p className="rounded-2xl bg-brand-soft p-4 text-ink">Buat kategori dulu di tab Kategori, baru tambah produk.</p>}

      {sold.length > 0 && (
        <div role="status" className="rounded-2xl bg-warn-soft p-4 text-sm text-warn-text">
          <b>{sold.length} produk sedang habis</b> dan tampil dengan label di toko:{' '}
          {sold.map((p, i) => <span key={p.id}>{i > 0 && ', '}{p.name} ({soldWord(p).toLowerCase()})</span>)}.
        </div>
      )}

      {data.categories.map((c) => {
        const items = c.products.filter((p) => (!s || p.name.toLowerCase().includes(s)) && (!onlySold || !p.available));
        if ((s || onlySold) && !items.length) return null;
        return (
          <section key={c.id}>
            <h2 className="mb-2 text-lg font-bold">{c.name} <span className="text-sm font-normal text-ink-2">({c.products.length})</span></h2>
            {items.length === 0 ? <p className="rounded-2xl border border-dashed border-line p-4 text-ink-2">Belum ada produk di kategori ini.</p> : (
              <ul className="card divide-y divide-line">
                {items.map((p, i) => (
                  <li key={p.id} className="space-y-3 p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <ProductImage src={p.image} name={p.name} sold={!p.available} className="h-14 w-14 shrink-0 rounded-xl" />
                      <div className="min-w-0 flex-1 basis-40">
                        <p className={`font-semibold ${p.available ? '' : 'text-ink-2'}`}>{p.name}</p>
                        <p className="num text-sm text-ink-2">{rp(p.price)}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-bold">
                          {!p.available && <span className="rounded-full bg-warn px-2 py-0.5 uppercase tracking-wide text-white">{soldWord(p)}</span>}
                          {p.is_addon && <span className="rounded-full bg-sky-soft px-2 py-0.5 text-sky">Topping ekstra</span>}
                          {p.has_addons && <span className="rounded-full bg-paper px-2 py-0.5 text-ink-2 ring-1 ring-line">Bisa tambah topping</span>}
                          {p.featured && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-brand-dark">Paling laris</span>}
                        </div>
                        {!p.available && p.sold_note && <p className="mt-1 text-xs italic text-warn-text">{p.sold_note}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button className="btn btn-ghost btn-sm" aria-label={`Naikkan ${p.name}`} disabled={busy || i === 0 || !!s} onClick={() => patch(p.id, { move: 'up' })}>↑</button>
                        <button className="btn btn-ghost btn-sm" aria-label={`Turunkan ${p.name}`} disabled={busy || i === items.length - 1 || !!s} onClick={() => patch(p.id, { move: 'down' })}>↓</button>
                        {p.available
                          ? <button className="btn btn-ghost btn-sm" onClick={() => setSoldFor({ id: p.id, label: p.sold_label, note: p.sold_note || '' })}>Tandai habis</button>
                          : <button className="btn btn-sm" disabled={busy} onClick={() => patch(p.id, { available: true }, `${p.name} tersedia lagi`)}>Tersedia lagi</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...EMPTY, ...p, image: p.image || '', description: p.description || '', note_hint: p.note_hint || '', sold_note: p.sold_note || '' })}>Edit</button>
                        <button className="btn btn-ghost btn-sm text-warn-text" onClick={() => setDelFor(p.id)}>Hapus</button>
                      </div>
                    </div>

                    {soldFor?.id === p.id && (
                      <div className="space-y-3 rounded-2xl bg-warn-soft p-3">
                        <p className="font-semibold text-warn-text">Tampilkan di toko sebagai:</p>
                        <div className="flex gap-2">
                          {['habis', 'kosong'].map((l) => (
                            <label key={l} className="cursor-pointer rounded-xl bg-card px-4 py-2 font-bold capitalize text-ink ring-1 ring-line has-[:checked]:bg-warn has-[:checked]:text-white">
                              <input type="radio" name={'lbl' + p.id} className="sr-only" checked={soldFor.label === l} onChange={() => setSoldFor({ ...soldFor, label: l })} />{l}
                            </label>
                          ))}
                        </div>
                        <div><label htmlFor={'sn' + p.id} className="mb-1 block text-sm font-semibold">Keterangan untuk pembeli (opsional)</label>
                          <input id={'sn' + p.id} className="field" maxLength={160} placeholder="Contoh: beef habis, kembali besok jam 10" value={soldFor.note} onChange={(e) => setSoldFor({ ...soldFor, note: e.target.value })} /></div>
                        <div className="flex gap-2">
                          <button className="btn btn-sm" disabled={busy} onClick={async () => { if (await patch(p.id, { available: false, sold_label: soldFor.label, sold_note: soldFor.note }, `${p.name} ditandai ${soldFor.label}`)) setSoldFor(null); }}>Simpan</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSoldFor(null)}>Batal</button>
                        </div>
                      </div>
                    )}
                    {delFor === p.id && (
                      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft p-3 text-warn-text">
                        <span className="flex-1 basis-48 font-semibold">Hapus “{p.name}” dari menu? Riwayat pesanan lama tetap aman.</span>
                        <button className="btn btn-sm bg-warn hover:bg-warn" disabled={busy} onClick={() => del(p)}>Ya, hapus</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDelFor(null)}>Batal</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {form && <ProductForm initial={form} categories={data.categories} close={() => setForm(null)} notify={notify} saved={() => { setForm(null); load(); }} />}
    </div>
  );
}

function ProductForm({ initial, categories, close, notify, saved }) {
  const [f, setF] = useState({ ...initial, price: String(initial.price ?? '') });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState(false);
  const editing = !!initial.id;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    const k = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', k);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.documentElement.style.overflow = prev; };
  }, [close]);

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setUp(true);
    const fd = new FormData(); fd.append('file', file);
    const r = await api('/api/seller/upload', 'POST', fd);
    setUp(false);
    if (!r.ok) { setErr(r.data.error || 'Foto gagal diunggah.'); return; }
    setF((x) => ({ ...x, image: r.data.url }));
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    const price = Number(String(f.price).replace(/\D/g, ''));
    if (!f.name.trim()) { setErr('Nama produk wajib diisi.'); return; }
    if (f.price === '' || !Number.isInteger(price)) { setErr('Isi harga dengan angka.'); return; }
    if (!f.category_id) { setErr('Pilih kategori.'); return; }
    const body = {
      name: f.name, category_id: Number(f.category_id), price, description: f.description, image: f.image || '',
      has_addons: f.has_addons && !f.is_addon, is_addon: f.is_addon, featured: f.featured && !f.is_addon, note_hint: f.note_hint,
      available: f.available, sold_label: f.sold_label, sold_note: f.sold_note,
    };
    setBusy(true);
    const r = editing ? await api('/api/seller/products/' + f.id, 'PATCH', body) : await api('/api/seller/products', 'POST', body);
    setBusy(false);
    if (!r.ok) { setErr(r.data.error || 'Gagal menyimpan.'); return; }
    notify(editing ? 'Produk diperbarui' : 'Produk ditambahkan');
    saved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/55" onClick={close} />
      <form onSubmit={submit} noValidate role="dialog" aria-modal="true" aria-label={editing ? 'Edit produk' : 'Tambah produk'} className="relative flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-card text-ink sm:rounded-3xl">
        <div className="flex items-center justify-between p-5 pb-2"><h2 className="text-xl font-bold">{editing ? 'Edit produk' : 'Tambah produk'}</h2>
          <button type="button" onClick={close} aria-label="Tutup" className="grid h-11 w-11 place-items-center rounded-full bg-paper text-2xl text-ink ring-1 ring-line">×</button></div>
        <div className="min-h-0 space-y-4 overflow-y-auto p-5 pt-2">
          <div className="flex items-center gap-3">
            <ProductImage src={f.image} name={f.name || 'Foto'} className="h-24 w-24 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <label className="btn btn-ghost btn-sm cursor-pointer">{up ? 'Mengunggah…' : f.image ? 'Ganti foto' : 'Unggah foto'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={upload} disabled={up} /></label>
              {f.image && <button type="button" className="btn btn-ghost btn-sm text-warn-text" onClick={() => setF((x) => ({ ...x, image: '' }))}>Hapus foto</button>}
              <p className="text-xs text-ink-2">JPG, PNG, atau WebP, maksimal 4 MB.</p>
            </div>
          </div>
          <div><label htmlFor="p-name" className="mb-1.5 block font-semibold">Nama produk</label><input id="p-name" className="field" maxLength={160} value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="p-cat" className="mb-1.5 block font-semibold">Kategori</label>
              <select id="p-cat" className="field" value={f.category_id} onChange={set('category_id')}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label htmlFor="p-price" className="mb-1.5 block font-semibold">Harga (Rp)</label><input id="p-price" className="field num" inputMode="numeric" value={f.price} onChange={set('price')} /></div>
          </div>
          <div><label htmlFor="p-desc" className="mb-1.5 block font-semibold">Deskripsi</label><textarea id="p-desc" className="field min-h-20" maxLength={1000} value={f.description} onChange={set('description')} /></div>
          <div><label htmlFor="p-hint" className="mb-1.5 block font-semibold">Contoh catatan untuk pembeli <span className="font-normal text-ink-2">(opsional)</span></label><input id="p-hint" className="field" maxLength={160} placeholder="Contoh: saos pedas, tanpa bombay" value={f.note_hint} onChange={set('note_hint')} /></div>

          <fieldset className="space-y-2">
            <legend className="lbl">Pengaturan tampil</legend>
            {[['has_addons', 'Pembeli bisa menambah ekstra topping', f.is_addon], ['featured', 'Tampilkan di “Paling Laris”', f.is_addon], ['is_addon', 'Ini adalah topping ekstra (tidak tampil sebagai menu sendiri)', false]].map(([k, l, dis]) => (
              <label key={k} className={`flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 ${dis ? 'opacity-50' : 'cursor-pointer'}`}>
                <input type="checkbox" className="h-5 w-5 accent-[#B85306]" checked={!!f[k] && !dis} disabled={dis} onChange={set(k)} />{l}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-3 rounded-2xl border border-line p-3">
            <legend className="lbl px-1">Stok</legend>
            <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-[#B85306]" checked={f.available} onChange={set('available')} />Tersedia untuk dipesan</label>
            {!f.available && (<>
              <div className="flex gap-2">
                {['habis', 'kosong'].map((l) => (
                  <label key={l} className="cursor-pointer rounded-xl bg-card px-4 py-2 font-bold capitalize text-ink ring-1 ring-line has-[:checked]:bg-warn has-[:checked]:text-white">
                    <input type="radio" name="p-label" className="sr-only" checked={f.sold_label === l} onChange={() => setF((x) => ({ ...x, sold_label: l }))} />{l}
                  </label>
                ))}
              </div>
              <div><label htmlFor="p-snote" className="mb-1 block text-sm font-semibold">Keterangan untuk pembeli (opsional)</label><input id="p-snote" className="field" maxLength={160} value={f.sold_note} onChange={set('sold_note')} /></div>
            </>)}
          </fieldset>
          {err && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">{err}</p>}
        </div>
        <div className="flex gap-3 border-t border-line p-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <button type="button" className="btn btn-ghost" onClick={close}>Batal</button>
          <button className="btn" disabled={busy || up}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- Kategori */
export function CategoriesAdmin({ notify }) {
  const [data, setData] = useState(null);
  const [name, setName] = useState('');
  const [edit, setEdit] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api('/api/seller/products'); if (r.ok) setData(r.data); }, []);
  useEffect(() => { load(); }, [load]);
  if (!data) return <p className="text-ink-2">Memuat kategori…</p>;

  async function run(fn, msg) {
    setErr(''); setBusy(true);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setErr(r.data.error || 'Gagal menyimpan.'); return false; }
    if (msg) notify(msg);
    await load();
    return true;
  }
  const cats = data.categories;
  return (
    <div className="max-w-2xl space-y-4">
      <form className="card flex flex-wrap items-end gap-3 p-4" onSubmit={async (e) => { e.preventDefault(); if (name.trim() && await run(() => api('/api/seller/categories', 'POST', { name }), 'Kategori ditambahkan')) setName(''); }}>
        <div className="min-w-0 flex-1 basis-56"><label htmlFor="c-new" className="mb-1.5 block font-semibold">Kategori baru</label>
          <input id="c-new" className="field" maxLength={120} placeholder="Contoh: Snack" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <button className="btn btn-sm" disabled={busy || !name.trim()}>Tambah</button>
      </form>
      {err && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">{err}</p>}
      <ul className="card divide-y divide-line">
        {cats.map((c, i) => (
          <li key={c.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {edit?.id === c.id ? (
                <>
                  <label className="sr-only" htmlFor={'cn' + c.id}>Nama kategori</label>
                  <input id={'cn' + c.id} className="field min-w-0 flex-1 basis-48" value={edit.name} maxLength={120} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
                  <button className="btn btn-sm" disabled={busy || !edit.name.trim()} onClick={async () => { if (await run(() => api('/api/seller/categories/' + c.id, 'PATCH', { name: edit.name }), 'Kategori diperbarui')) setEdit(null); }}>Simpan</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Batal</button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1 basis-40"><p className="font-semibold">{c.name}</p><p className="text-sm text-ink-2">{c.products.length} produk</p></div>
                  <button className="btn btn-ghost btn-sm" aria-label={`Naikkan ${c.name}`} disabled={busy || i === 0} onClick={() => run(() => api('/api/seller/categories/' + c.id, 'PATCH', { move: 'up' }))}>↑</button>
                  <button className="btn btn-ghost btn-sm" aria-label={`Turunkan ${c.name}`} disabled={busy || i === cats.length - 1} onClick={() => run(() => api('/api/seller/categories/' + c.id, 'PATCH', { move: 'down' }))}>↓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEdit({ id: c.id, name: c.name })}>Ubah nama</button>
                  <button className="btn btn-ghost btn-sm text-warn-text" onClick={() => setDelFor(c.id)}>Hapus</button>
                </>
              )}
            </div>
            {delFor === c.id && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft p-3 text-warn-text">
                <span className="flex-1 basis-48 font-semibold">Hapus kategori “{c.name}”?{c.products.length ? ' Kategori ini masih berisi produk, pindahkan atau hapus produknya dulu.' : ''}</span>
                <button className="btn btn-sm bg-warn hover:bg-warn" disabled={busy} onClick={async () => { await run(() => api('/api/seller/categories/' + c.id, 'DELETE'), 'Kategori dihapus'); setDelFor(null); }}>Ya, hapus</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setDelFor(null)}>Batal</button>
              </div>
            )}
          </li>
        ))}
        {!cats.length && <li className="p-4 text-ink-2">Belum ada kategori.</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- Pengaturan */
function Field({ id, label, hint, ...p }) {
  return (
    <div><label htmlFor={id} className="mb-1.5 block font-semibold">{label}</label><input id={id} className="field" {...p} />{hint && <p className="mt-1 text-sm text-ink-2">{hint}</p>}</div>
  );
}

export function SettingsAdmin({ notify }) {
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/seller/settings').then((r) => r.ok && setF(Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, String(v ?? '')])))); }, []);
  if (!f) return <p className="text-ink-2">Memuat pengaturan…</p>;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault(); setErr('');
    const lat = Number(f.outlet_lat), lng = Number(f.outlet_lng);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) { setErr('Koordinat outlet belum benar. Contoh: -6.3225 dan 107.4395.'); return; }
    if (f.wa_number.replace(/\D/g, '').length < 9) { setErr('Nomor WhatsApp belum benar. Contoh: 6288299612231.'); return; }
    setBusy(true);
    const r = await api('/api/seller/settings', 'PUT', f);
    setBusy(false);
    if (!r.ok) { setErr(r.data.error || 'Gagal menyimpan.'); return; }
    setF(Object.fromEntries(Object.entries(r.data).map(([k, v]) => [k, String(v ?? '')])));
    notify('Pengaturan disimpan');
  }
  return (
    <form onSubmit={save} noValidate className="max-w-xl space-y-4">
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">Toko</h2>
        <Field id="s-wa" label="Nomor WhatsApp penjual" inputMode="numeric" value={f.wa_number} onChange={set('wa_number')} hint="Format 62..., tanpa tanda + dan spasi. Pesanan pelanggan dikirim ke nomor ini." />
        <Field id="s-open" label="Jam buka (opsional)" value={f.open_hours.trim()} onChange={set('open_hours')} placeholder="10.00 - 21.00" />
      </section>
      <CouriersAdmin notify={notify} />
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">Lokasi outlet dan ongkir</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field id="s-lat" label="Latitude outlet" inputMode="decimal" value={f.outlet_lat} onChange={set('outlet_lat')} />
          <Field id="s-lng" label="Longitude outlet" inputMode="decimal" value={f.outlet_lng} onChange={set('outlet_lng')} />
        </div>
        <p className="text-sm text-ink-2">Ongkir dihitung dari titik ini. Di Google Maps, tekan lama di lokasi outlet lalu salin dua angka koordinatnya.{' '}
          <a className="font-semibold text-brand-dark underline" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps?q=${f.outlet_lat},${f.outlet_lng}`}>Cek titik ini di Maps</a></p>
        <div className="grid grid-cols-2 gap-3">
          <Field id="s-fee" label="Ongkir per km (Rp)" inputMode="numeric" value={f.fee_per_km} onChange={set('fee_per_km')} />
          <Field id="s-max" label="Jangkauan maks (km)" inputMode="numeric" value={f.max_km} onChange={set('max_km')} />
        </div>
        <Field id="s-free" label="Gratis ongkir mulai belanja (Rp)" inputMode="numeric" value={f.free_above} onChange={set('free_above')} hint="Isi 0 bila tidak ada gratis ongkir." />
        <Field id="s-discount" label="Diskon semua pesanan (%)" inputMode="decimal" value={f.discount_percent} onChange={set('discount_percent')} hint="Diskon dihitung dari subtotal. Isi 0 bila tidak ada diskon." />
      </section>
      {err && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button>
    </form>
  );
}

function CouriersAdmin({ notify }) {
  const [couriers, setCouriers] = useState([]);
  const [form, setForm] = useState({ name: '', username: '', password: '', phone: '' });
  const [reset, setReset] = useState({});
  const [error, setError] = useState('');
  const load = useCallback(async () => { const r = await api('/api/seller/couriers'); if (r.ok) setCouriers(r.data.couriers || []); }, []);
  useEffect(() => { load(); }, [load]);
  async function add() {
    setError('');
    const r = await api('/api/seller/couriers', 'POST', form);
    if (!r.ok) { setError(r.data.error || 'Akun belum bisa dibuat.'); return; }
    setForm({ name: '', username: '', password: '', phone: '' }); notify('Akun kurir dibuat'); load();
  }
  async function patch(id, body, message) {
    const r = await api(`/api/seller/couriers/${id}`, 'PATCH', body);
    if (!r.ok) { setError(r.data.error || 'Perubahan belum tersimpan.'); return; }
    setReset((x) => ({ ...x, [id]: '' })); notify(message); load();
  }
  return (
    <section className="card space-y-4 p-5">
      <h2 className="text-lg font-bold">Akun kurir</h2>
      <p className="text-sm text-ink-2">Maksimal dua akun. Pesanan hanya tampil pada akun kurir yang dipilih seller.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="courier-name" label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Field id="courier-username" label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <Field id="courier-password" label="Password awal (min. 8 karakter)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
        <Field id="courier-phone" label="Telepon (opsional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-warn-soft p-3 text-warn-text">{error}</p>}
      <button type="button" className="btn" onClick={add} disabled={couriers.length >= 2 || !form.name || !form.username || form.password.length < 8}>{couriers.length >= 2 ? 'Maksimal dua akun' : 'Tambah kurir'}</button>
      <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
        {couriers.map((c) => (
          <li key={c.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{c.name}</b> · <span className="font-mono">{c.username}</span>{c.phone && ` · ${c.phone}`}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${c.active ? 'bg-leaf-soft text-leaf' : 'bg-paper text-ink-2'}`}>{c.active ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => patch(c.id, { active: !c.active }, c.active ? 'Kurir dinonaktifkan' : 'Kurir diaktifkan')}>{c.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
              <input className="field max-w-xs" type="password" placeholder="Password baru (min. 8)" value={reset[c.id] || ''} onChange={(e) => setReset({ ...reset, [c.id]: e.target.value })} autoComplete="new-password" />
              <button type="button" className="btn btn-ghost btn-sm" disabled={(reset[c.id] || '').length < 8} onClick={() => patch(c.id, { password: reset[c.id] }, 'Password kurir direset')}>Reset password</button>
            </div>
          </li>
        ))}
        {!couriers.length && <li className="p-3 text-ink-2">Belum ada akun kurir.</li>}
      </ul>
    </section>
  );
}
