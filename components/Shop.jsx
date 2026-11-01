'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { rp } from '@/lib/format';
import ProductImage from './ProductImage';
import HScroll from './HScroll';
import HeroCarousel from './HeroCarousel';
import ThemeToggle from './ThemeToggle';
import FloatingDock from './FloatingDock';
import BackButton from './BackButton';

const LocationPicker = dynamic(() => import('./LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-brand-soft sm:h-72" />,
});

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* penyimpanan penuh atau diblokir */ } },
};
const lineTotal = (l) => l.unit * l.qty;
const soldWord = (p) => (p.sold_label === 'kosong' ? 'Kosong' : 'Habis');
const gutter = { paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' };

function indexMenu(m) {
  const products = {}, addons = {};
  m.categories.forEach((c) => c.products.forEach((p) => { products[p.id] = p; }));
  m.addons.forEach((a) => { addons[a.id] = a; });
  return { products, addons };
}
// Samakan harga dan topping isi keranjang dengan menu terbaru. Mengembalikan array yang sama bila tidak ada perubahan.
function reconcile(cart, live) {
  let changed = false;
  const next = cart.map((l) => {
    const p = live.products[l.id];
    if (!p) return l;
    const addons = l.addons.filter((a) => live.addons[a.id]).map((a) => ({ id: a.id, name: live.addons[a.id].name, price: live.addons[a.id].price }));
    const unit = p.price + addons.reduce((s, a) => s + a.price, 0);
    if (unit === l.unit && addons.length === l.addons.length && addons.every((a, i) => a.price === l.addons[i].price)) return l;
    changed = true;
    return { ...l, addons, unit };
  });
  return changed ? next : cart;
}
const soldInfo = (l, live) => {
  const p = live.products[l.id];
  if (!p) return { word: 'Tidak tersedia', note: '' };
  if (!p.available) return { word: soldWord(p), note: p.sold_note || '' };
  return null;
};
// Di luar komponen agar input tidak kehilangan fokus setiap kali mengetik.
const FieldErr = ({ msg }) => (msg ? <p role="alert" className="mt-1 text-sm text-warn-text">{msg}</p> : null);

export default function Shop({ menu, error, store: info, settings }) {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(() => indexMenu(menu));
  const [sheet, setSheet] = useState(null);
  const [view, setView] = useState('menu');
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState('');
  const [active, setActive] = useState('');
  const [last, setLast] = useState('');
  const toastT = useRef();
  const navRef = useRef(null);
  const menuY = useRef(0);

  const featured = useMemo(() => menu.featured || [], [menu]);
  const sections = useMemo(() => [...(featured.length ? [{ slug: 'laris', name: 'Paling Laris' }] : []), ...menu.categories.map((c) => ({ slug: c.slug, name: c.name }))], [menu, featured.length]);
  const soldList = useMemo(() => menu.categories.flatMap((c) => c.products).filter((p) => !p.available), [menu]);
  // Carousel: produk tersedia yang punya foto. Paling laris didahulukan.
  const heroItems = useMemo(() => {
    const seen = new Set(), out = [];
    for (const p of [...featured, ...menu.categories.flatMap((c) => c.products)]) {
      if (!p.image || !p.available || seen.has(p.id)) continue;
      seen.add(p.id); out.push(p);
    }
    return out.slice(0, 8);
  }, [menu, featured]);

  useEffect(() => {
    setCart(store.get('kbt_cart', []));
    setLast(store.get('kbt_last', ''));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) store.set('kbt_cart', cart); }, [cart, ready]);
  useEffect(() => { if (ready) setCart((c) => reconcile(c, live)); }, [ready, live]);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/menu', { cache: 'no-store' });
      if (r.ok) setLive(indexMenu(await r.json()));
    } catch { /* tetap pakai data yang ada */ }
  }, []);
  useEffect(() => { if (view === 'checkout') refresh(); }, [view, refresh]);

  useEffect(() => {
    if (view !== 'menu') return undefined;
    const on = () => {
      let cur = sections[0]?.slug;
      sections.forEach((s) => { const el = document.getElementById('cat-' + s.slug); if (el && el.getBoundingClientRect().top < 150) cur = s.slug; });
      setActive(cur);
    };
    window.addEventListener('scroll', on, { passive: true });
    on();
    return () => window.removeEventListener('scroll', on);
  }, [view, sections]);

  // Tab kategori aktif selalu terlihat di bar.
  useEffect(() => {
    const el = navRef.current;
    const tab = el?.querySelector(`[data-cat="${active}"]`);
    if (el && tab) el.scrollTo({ left: tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  const okLines = cart.filter((l) => !soldInfo(l, live));
  const soldLines = cart.filter((l) => soldInfo(l, live));
  const count = okLines.reduce((s, l) => s + l.qty, 0);
  const subtotal = okLines.reduce((s, l) => s + lineTotal(l), 0);
  const say = (t) => { setToast(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(''), 2200); };

  function add(product, addons, note, qty) {
    const unit = product.price + addons.reduce((s, a) => s + a.price, 0);
    const key = [product.id, addons.map((a) => a.id).sort().join('.'), note].join('|');
    setCart((c) => {
      const f = c.find((l) => l.key === key);
      if (f) return c.map((l) => (l === f ? { ...l, qty: l.qty + qty } : l));
      return [...c, { key, id: product.id, name: product.name, addons, note, unit, qty }];
    });
    say(`${product.name} masuk keranjang`);
  }
  const bump = (key, d) => setCart((c) => c.flatMap((l) => (l.key === key ? (l.qty + d > 0 ? [{ ...l, qty: l.qty + d }] : []) : [l])));
  const removeSold = () => setCart((c) => c.filter((l) => !soldInfo(l, live)));

  // Posisi scroll menu disimpan saat ke checkout, lalu dipulihkan saat kembali.
  const goCheckout = () => {
    menuY.current = window.scrollY;
    setShowCart(false);
    setView('checkout');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const backToMenu = () => {
    setView('menu');
    requestAnimationFrame(() => window.scrollTo({ top: menuY.current, behavior: 'auto' }));
  };

  if (view === 'checkout')
    return (
      <Checkout cart={cart} live={live} bump={bump} subtotal={subtotal} settings={settings} refresh={refresh} removeSold={removeSold}
        back={backToMenu} done={(code) => { setCart([]); store.set('kbt_last', code); router.push(`/order/${code}?baru=1`); }} />
    );

  return (
    <div className="mx-auto max-w-5xl pb-28 lg:pb-12" style={gutter}>
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/logo.jpg" alt="" width="44" height="44" className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0">
            <p className="font-display text-xl font-extrabold leading-none">Kaboba <span className="text-brand-dark">Time</span></p>
            <p className="mt-1 truncate text-xs text-ink-2">{info.tagline}</p>
          </div>
        </div>
        <nav aria-label="Pintasan" className="flex shrink-0 items-center gap-2">
          <a href="/order/cari" className="rounded-full px-3 py-2 text-sm font-semibold text-ink ring-1 ring-inset ring-line hover:bg-brand-soft">Lacak pesanan</a>
          <a href="/penjual" className="rounded-full px-3 py-2 text-sm font-semibold text-ink-2 hover:text-ink">Penjual</a>
          <ThemeToggle />
        </nav>
      </header>

      <section className="relative isolate overflow-hidden rounded-[28px] bg-hero text-hero-ink">
        <div aria-hidden className="absolute -right-16 -top-16 -z-10 h-72 w-72 rounded-full bg-brand/40 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
        <div className="grid items-center gap-8 p-6 sm:p-8 md:grid-cols-2 md:gap-10">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-hero-muted">{info.area}</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-[1.02] sm:text-5xl">Kebab hangat, <span className="text-hero-accent">antar sampai rumah.</span></h1>
            <p className="mt-3 max-w-md text-hero-muted">Pilih menu, isi data, pesananmu langsung masuk ke WhatsApp kami.</p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
              <li className="rounded-full bg-hero-chip px-3 py-1.5 ring-1 ring-inset ring-white/20">Ongkir {rp(settings.fee_per_km)} per km</li>
              <li className="rounded-full bg-hero-chip px-3 py-1.5 ring-1 ring-inset ring-white/20">Antar maks {settings.max_km} km</li>
              <li className="rounded-full bg-hero-chip px-3 py-1.5 ring-1 ring-inset ring-white/20">Ambil sendiri gratis</li>
              {settings.open_hours && <li className="rounded-full bg-hero-chip px-3 py-1.5 ring-1 ring-inset ring-white/20">Buka {settings.open_hours}</li>}
            </ul>
            <button type="button" className="btn mt-6 w-auto px-7" onClick={() => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Lihat menu</button>
          </div>
          {heroItems.length > 0 && <HeroCarousel items={heroItems} onOpen={(p) => setSheet(p)} />}
        </div>
      </section>

      {ready && last && (
        <a href={`/order/${last}`} className="card mt-5 flex items-center justify-between gap-3 p-4 hover:border-brand/50">
          <span className="min-w-0">
            <span className="block text-sm text-ink-2">Pesanan terakhir</span>
            <span className="block truncate font-mono font-medium">{last}</span>
          </span>
          <span className="shrink-0 font-semibold text-brand-dark">Lacak →</span>
        </a>
      )}

      {error && <p className="card mt-6 p-5 text-warn-text">Menu belum bisa dimuat. Coba muat ulang halaman sebentar lagi.</p>}

      {soldList.length > 0 && (
        <div role="status" className="mt-5 rounded-2xl bg-warn-soft p-4 text-sm text-warn-text">
          <b>Sedang tidak tersedia:</b>{' '}
          {soldList.map((p, i) => <span key={p.id}>{i > 0 && ', '}{p.name} ({soldWord(p).toLowerCase()})</span>)}
        </div>
      )}

      <div id="menu" className="mt-2 grid scroll-mt-4 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <main className="min-w-0">
          <nav aria-label="Kategori menu" className="sticky z-20 -mx-4 border-b border-line bg-paper" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
            <HScroll label="Kategori menu" scrollerRef={navRef} innerClass="gap-2 px-4 py-3">
              {sections.map((s) => (
                <button key={s.slug} data-cat={s.slug} aria-current={active === s.slug ? 'true' : undefined}
                  onClick={() => document.getElementById('cat-' + s.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${active === s.slug ? 'bg-ink text-paper ring-ink' : 'bg-card text-ink ring-line hover:bg-brand-soft'}`}>
                  {s.name}
                </button>
              ))}
            </HScroll>
          </nav>

          {featured.length > 0 && (
            <section id="cat-laris" className="scroll-mt-20 pt-6">
              <h2 className="mb-3 text-2xl font-bold">Paling Laris</h2>
              <HScroll label="Menu paling laris" className="-mx-4" innerClass="gap-3 px-4 pb-2">
                {featured.map((p) => <FeaturedCard key={p.id} p={p} onOpen={() => setSheet(p)} />)}
              </HScroll>
            </section>
          )}

          {menu.categories.map((c) => (
            <section key={c.slug} id={'cat-' + c.slug} className="scroll-mt-20 pt-6">
              <h2 className="mb-3 text-2xl font-bold">{c.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {c.products.map((p) => <ProductCard key={p.id} p={p} onOpen={() => setSheet(p)} />)}
              </div>
            </section>
          ))}
        </main>

        <aside className="card sticky top-4 hidden p-5 lg:block">
          <h2 className="mb-3 text-lg font-bold">Pesanan kamu</h2>
          <CartPanel cart={cart} live={live} bump={bump} subtotal={subtotal} onCheckout={goCheckout} removeSold={removeSold} soldCount={soldLines.length} />
        </aside>
      </div>

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-sm text-ink-2">
        <span>{info.name} · {info.area}</span>
        <a href="/penjual" className="hover:underline">Halaman penjual</a>
      </footer>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-paper via-paper/95 to-transparent px-4 pt-6 lg:hidden"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))', paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
          <button className="btn mx-auto max-w-xl justify-between shadow-lg" onClick={() => setShowCart(true)}>
            <span>Lihat pesanan · {count} item{soldLines.length ? ' (ada yang habis)' : ''}</span><span className="num">{rp(subtotal)}</span>
          </button>
        </div>
      )}

      <FloatingDock raised={cart.length > 0} />

      {showCart && (
        <Overlay close={() => setShowCart(false)} label="Pesanan kamu">
          <div className="flex items-center justify-between p-5 pb-2"><h2 className="text-lg font-bold">Pesanan kamu</h2>
            <button onClick={() => setShowCart(false)} aria-label="Tutup" className="grid h-11 w-11 place-items-center rounded-full bg-paper text-2xl text-ink ring-1 ring-line">×</button></div>
          <div className="overflow-y-auto p-5 pt-2" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
            <CartPanel cart={cart} live={live} bump={bump} subtotal={subtotal} onCheckout={goCheckout} removeSold={removeSold} soldCount={soldLines.length} />
          </div>
        </Overlay>
      )}

      {sheet && <Sheet p={sheet} addons={Object.values(live.addons)} close={() => setSheet(null)} add={(...a) => { add(...a); setSheet(null); }} />}
      {toast && <div role="status" className="fixed left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper" style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}>{toast}</div>}
    </div>
  );
}

function Overlay({ children, close, label }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', k);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.documentElement.style.overflow = prev; };
  }, [close]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/55" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label={label} className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-card text-ink sm:rounded-3xl">{children}</div>
    </div>
  );
}

function SoldBadge({ p, small }) {
  return <span className={`rounded-full bg-warn font-extrabold uppercase tracking-wider text-white ${small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs'}`}>{soldWord(p)}</span>;
}

function ProductCard({ p, onOpen }) {
  const sold = !p.available;
  return (
    <button type="button" aria-disabled={sold} onClick={sold ? undefined : onOpen}
      className={`card flex gap-3 p-3 text-left transition ${sold ? 'cursor-not-allowed' : 'hover:border-brand/50 active:scale-[.99]'}`}>
      <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
        <ProductImage src={p.image} name={p.name} sold={sold} className="h-full w-full rounded-2xl" />
        {sold && <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/50"><SoldBadge p={p} /></div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className={`text-base font-bold leading-snug ${sold ? 'text-ink-2' : ''}`}>{p.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-2">{p.description}</p>
        {sold && p.sold_note && <p className="mt-1 text-xs font-semibold italic text-warn-text">{p.sold_note}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className={`num font-bold ${sold ? 'text-ink-2 line-through' : ''}`}>{rp(p.price)}</span>
          {sold
            ? <span className="rounded-full bg-warn-soft px-3 py-1.5 text-xs font-bold text-warn-text">{soldWord(p)}</span>
            : <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-brand text-2xl leading-none text-white">+</span>}
        </div>
      </div>
    </button>
  );
}

function FeaturedCard({ p, onOpen }) {
  const sold = !p.available;
  return (
    <button type="button" aria-disabled={sold} onClick={sold ? undefined : onOpen}
      className={`card w-44 shrink-0 overflow-hidden text-left sm:w-48 ${sold ? 'cursor-not-allowed' : 'hover:border-brand/50'}`}>
      <div className="relative">
        <ProductImage src={p.image} name={p.name} sold={sold} className="aspect-square w-full" />
        {sold && <div className="absolute inset-0 grid place-items-center bg-black/50"><SoldBadge p={p} /></div>}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">{p.name}</h3>
        <div className="mt-2 flex items-center justify-between">
          <span className={`num font-bold ${sold ? 'text-ink-2 line-through' : ''}`}>{rp(p.price)}</span>
          {!sold && <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-brand text-xl leading-none text-white">+</span>}
        </div>
      </div>
    </button>
  );
}

// Tombol − putih di atas latar gelap dan + oranye: keduanya selalu terlihat di mode terang maupun gelap.
function Stepper({ qty, dec, inc, big }) {
  const size = big ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-paper p-1 ring-1 ring-line">
      <button type="button" onClick={dec} aria-label="Kurangi" className={`grid ${size} place-items-center rounded-full bg-card text-xl font-bold leading-none text-ink ring-1 ring-line hover:bg-brand-soft`}>−</button>
      <span className="num min-w-[1.75rem] text-center font-bold">{qty}</span>
      <button type="button" onClick={inc} aria-label="Tambah" className={`grid ${size} place-items-center rounded-full bg-brand text-xl font-bold leading-none text-white hover:bg-brand-dark`}>+</button>
    </div>
  );
}

function CartLines({ cart, live, bump }) {
  return (
    <ul className="divide-y divide-line">
      {cart.map((l) => {
        const sold = soldInfo(l, live);
        return (
          <li key={l.key} className="flex justify-between gap-3 py-3">
            <div className="min-w-0">
              <b className={`block font-semibold ${sold ? 'text-ink-2 line-through' : ''}`}>{l.name}</b>
              {sold && <span className="mt-0.5 inline-block rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn-text">{sold.word}</span>}
              {sold?.note && <small className="block italic text-warn-text">{sold.note}</small>}
              {l.addons.length > 0 && <small className="block text-ink-2">+ {l.addons.map((a) => a.name.replace('Ekstra ', '')).join(', ')}</small>}
              {l.note && <small className="block break-words text-ink-2">“{l.note}”</small>}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="num font-semibold">{rp(lineTotal(l))}</span>
              <Stepper qty={l.qty} dec={() => bump(l.key, -1)} inc={() => bump(l.key, 1)} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function CartPanel({ cart, live, bump, subtotal, onCheckout, removeSold, soldCount }) {
  if (!cart.length) return <p className="text-ink-2">Belum ada yang dipilih. Pilih menu, nanti muncul di sini.</p>;
  return (
    <>
      <CartLines cart={cart} live={live} bump={bump} />
      {soldCount > 0 && (
        <div role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn-text">
          {soldCount} menu di keranjang sedang habis. <button type="button" onClick={removeSold} className="font-bold underline">Hapus yang habis</button>
        </div>
      )}
      <div className="mt-3 flex justify-between border-t border-dashed border-line pt-3"><span>Subtotal</span><b className="num">{rp(subtotal)}</b></div>
      <button type="button" className="btn mt-4" disabled={subtotal <= 0} onClick={onCheckout}>Lanjut ke checkout</button>
    </>
  );
}

function Sheet({ p, addons, close, add }) {
  const [qty, setQty] = useState(1);
  const [picked, setPicked] = useState([]);
  const [note, setNote] = useState('');
  const chosen = addons.filter((a) => picked.includes(a.id));
  const unit = p.price + chosen.reduce((s, a) => s + a.price, 0);
  return (
    <Overlay close={close} label={p.name}>
      <div className="relative shrink-0">
        <ProductImage src={p.image} name={p.name} className="h-48 w-full rounded-t-3xl sm:h-56" />
        <button type="button" onClick={close} aria-label="Tutup" className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-2xl leading-none text-white shadow-lg ring-1 ring-white/30 hover:bg-black/75">×</button>
      </div>
      <div className="min-h-0 space-y-5 overflow-y-auto p-5">
        <div>
          <h3 className="text-xl font-bold">{p.name}</h3>
          <p className="num mt-1 font-bold text-brand-dark">{rp(p.price)}</p>
          {p.description && <p className="mt-2 text-ink-2">{p.description}</p>}
        </div>
        {p.has_addons && addons.length > 0 && (
          <fieldset>
            <legend className="lbl">Ekstra topping</legend>
            <div className="space-y-2">
              {addons.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                  <span className="flex items-center gap-3">
                    <input type="checkbox" className="h-5 w-5 accent-[#B85306]" checked={picked.includes(a.id)}
                      onChange={(e) => setPicked((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))} />
                    {a.name.replace('Ekstra ', '')}
                  </span>
                  <span className="num text-sm text-ink-2">+{rp(a.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div>
          <label htmlFor="note" className="lbl block">Catatan untuk penjual</label>
          <input id="note" className="field" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder={p.note_hint || 'Contoh: es dikit, tanpa sedotan'} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 border-t border-line p-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
        <Stepper big qty={qty} dec={() => setQty((q) => Math.max(1, q - 1))} inc={() => setQty((q) => Math.min(30, q + 1))} />
        <button type="button" className="btn" onClick={() => add(p, chosen, note.replace(/\s+/g, ' ').trim(), qty)}>Tambah · <span className="num">{rp(unit * qty)}</span></button>
      </div>
    </Overlay>
  );
}

const PAY_OPTIONS = [
  ['Tunai', 'bayar saat terima'],
  ['Transfer', 'transfer, lalu kirim bukti'],
  ['QRIS', 'scan QRIS, lalu kirim bukti'],
];

function Checkout({ cart, live, bump, subtotal, settings, refresh, removeSold, back, done }) {
  const [f, setF] = useState({ name: '', phone: '', mode: 'antar', address: '', landmark: '', payment: 'Tunai', note: '' });
  const [loc, setLoc] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    const c = store.get('kbt_cust', {});
    setF((x) => ({ ...x, name: c.name || '', phone: c.phone || '', address: c.address || '', landmark: c.landmark || '' }));
    if (c.loc) setLoc(c.loc);
  }, []);
  useEffect(() => { if (!cart.length) back(); }, [cart.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const soldLines = cart.filter((l) => soldInfo(l, live));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  // Hitung ongkir setiap titik atau subtotal berubah.
  useEffect(() => {
    if (f.mode !== 'antar' || !loc) { setQuote(null); setQuoting(false); return undefined; }
    const my = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/delivery/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...loc, subtotal }) });
        const d = await r.json();
        if (my === seq.current) setQuote(r.ok ? d : { error: d.error || 'Ongkir belum bisa dihitung.' });
      } catch { if (my === seq.current) setQuote({ error: 'Ongkir belum bisa dihitung. Periksa koneksi lalu coba lagi.' }); }
      if (my === seq.current) setQuoting(false);
    }, 350);
    return () => clearTimeout(t);
  }, [loc, subtotal, f.mode]);

  const fee = f.mode === 'ambil' ? 0 : quote?.ok ? quote.fee : 0;
  const feeKnown = f.mode === 'ambil' || (quote?.ok && !quoting);
  const far = f.mode === 'antar' && quote?.ok && !quote.withinRange;
  const total = subtotal + fee;
  const canSubmit = !busy && !soldLines.length && subtotal > 0 && !far && (f.mode === 'ambil' || (quote?.ok && !quoting));

  async function submit(e) {
    e.preventDefault();
    const er = {};
    if (!f.name.trim()) er.name = 'Isi nama kamu.';
    const d = f.phone.replace(/\D/g, '');
    if (d.length < 9 || d.length > 15) er.phone = 'Nomor WhatsApp belum benar, contoh 081234567890.';
    if (f.mode === 'antar' && f.address.trim().length < 8) er.address = 'Isi alamat lengkap untuk pengantaran.';
    if (f.mode === 'antar' && !loc) er.loc = 'Pilih titik antar di peta.';
    setErr(er); setFail('');
    const first = Object.keys(er)[0];
    if (first) {
      const el = document.getElementById('f-' + first);
      el?.focus();
      el?.scrollIntoView({ block: 'center' });
      return;
    }
    setBusy(true);
    try {
      const address = f.mode === 'antar' ? f.address.trim() + (f.landmark.trim() ? ` (patokan: ${f.landmark.trim()})` : '') : '';
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, address, lat: loc?.lat, lng: loc?.lng, items: cart.map((l) => ({ id: l.id, qty: l.qty, note: l.note, addons: l.addons.map((a) => a.id) })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { if (data.soldOut || data.reload) refresh(); throw new Error(data.error || 'Gagal membuat pesanan.'); }
      store.set('kbt_cust', { name: f.name, phone: f.phone, address: f.address, landmark: f.landmark, loc });
      done(data.code);
    } catch (x) { setFail(x.message); setBusy(false); }
  }

  const submitLabel = busy ? 'Menyimpan…' : <>Pesan sekarang · <span className="num">{rp(total)}</span></>;

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex max-w-xl flex-col gap-4 py-5 pb-32 md:pb-10" style={gutter}>
      <BackButton onBack={back} label="Kembali ke menu" />
      <h1 className="text-3xl font-extrabold">Konfirmasi pesanan</h1>

      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">Pesanan</h2>
        <CartLines cart={cart} live={live} bump={bump} />
        {soldLines.length > 0 && (
          <div role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn-text">
            Ada menu yang sedang habis, jadi pesanan belum bisa dikirim. <button type="button" onClick={removeSold} className="font-bold underline">Hapus yang habis</button>
          </div>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">Data pemesan</h2>
        <div><label htmlFor="f-name" className="mb-1.5 block font-semibold">Nama</label>
          <input id="f-name" className="field" autoComplete="name" value={f.name} onChange={set('name')} aria-invalid={!!err.name} /><FieldErr msg={err.name} /></div>
        <div><label htmlFor="f-phone" className="mb-1.5 block font-semibold">Nomor WhatsApp</label>
          <input id="f-phone" className="field" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" value={f.phone} onChange={set('phone')} aria-invalid={!!err.phone} /><FieldErr msg={err.phone} /></div>
        <div>
          <p className="lbl">Layanan</p>
          <div className="grid grid-cols-2 gap-2">
            {[['antar', 'Antar', 'ongkir per km'], ['ambil', 'Ambil sendiri', 'di outlet, gratis']].map(([v, t, s]) => (
              <label key={v} className="cursor-pointer rounded-xl border border-line bg-paper p-3 text-center has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                <input type="radio" name="mode" value={v} checked={f.mode === v} onChange={set('mode')} className="sr-only" />
                <span className="block font-semibold">{t}</span><small className="text-ink-2">{s}</small>
              </label>
            ))}
          </div>
        </div>
        {f.mode === 'antar' && (<>
          <div>
            <p className="lbl" id="f-loc">Titik antar</p>
            <div id="f-loc-box"><LocationPicker value={loc} onChange={setLoc} outlet={settings.outlet} /></div>
            <FieldErr msg={err.loc} />
          </div>
          <div><label htmlFor="f-address" className="mb-1.5 block font-semibold">Alamat lengkap</label>
            <textarea id="f-address" className="field min-h-20" autoComplete="street-address" placeholder="Jalan, nomor rumah, RT/RW, kelurahan" value={f.address} onChange={set('address')} aria-invalid={!!err.address} /><FieldErr msg={err.address} /></div>
          <div><label htmlFor="f-landmark" className="mb-1.5 block font-semibold">Patokan <span className="font-normal text-ink-2">(opsional)</span></label>
            <input id="f-landmark" className="field" placeholder="Contoh: pagar hitam, depan warung" value={f.landmark} onChange={set('landmark')} /></div>
        </>)}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-bold">Pembayaran</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PAY_OPTIONS.map(([v, s]) => (
            <label key={v} className="cursor-pointer rounded-xl border border-line bg-paper p-3 text-center has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
              <input type="radio" name="pay" value={v} checked={f.payment === v} onChange={() => setF((x) => ({ ...x, payment: v }))} className="sr-only" />
              <span className="block font-semibold">{v}</span><small className="text-ink-2">{s}</small>
            </label>
          ))}
        </div>
        <div><label htmlFor="f-note" className="mb-1.5 block font-semibold">Catatan <span className="font-normal text-ink-2">(opsional)</span></label>
          <textarea id="f-note" className="field min-h-16" maxLength={200} placeholder="Contoh: tolong telepon saat sampai" value={f.note} onChange={set('note')} /></div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Ringkasan</h2>
        <div className="space-y-1.5">
          <div className="flex justify-between"><span>Subtotal</span><span className="num">{rp(subtotal)}</span></div>
          <div className="flex justify-between gap-3">
            <span>{f.mode === 'antar' ? 'Ongkir' : 'Ambil di outlet'}</span>
            <span className={`num text-right ${feeKnown && !fee ? 'font-bold text-leaf' : ''}`}>
              {f.mode === 'ambil' ? 'Gratis' : quoting ? 'Menghitung…' : quote?.ok ? (quote.fee ? rp(quote.fee) : 'Gratis') : 'Pilih lokasi dulu'}
            </span>
          </div>
          {f.mode === 'antar' && quote?.ok && (
            <p className="text-sm text-ink-2">{String(quote.km).replace('.', ',')} km, dibulatkan {quote.billedKm} km × {rp(quote.perKm)}{quote.free ? ' (gratis ongkir)' : ''}</p>
          )}
          <div className="flex justify-between pt-1 text-lg font-extrabold"><span>Total</span><span className="num">{rp(total)}</span></div>
        </div>
        {far && <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-warn-text">Lokasimu {String(quote.km).replace('.', ',')} km dari outlet, di luar jangkauan antar (maks {quote.maxKm} km). Pilih ambil sendiri, atau hubungi kami lewat WhatsApp.</p>}
        {f.mode === 'antar' && quote?.error && <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-warn-text">{quote.error}</p>}
        {fail && <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-warn-text">{fail}</p>}
        {/* Tombol utama hanya satu per layar: di HP memakai bar bawah, di desktop memakai tombol ini. */}
        <button type="submit" className="btn mt-4 hidden md:inline-flex" disabled={!canSubmit}>{submitLabel}</button>
        <p className="mt-3 text-sm text-ink-2">Setelah memesan kamu mendapat kode order. Kirim pesanannya lewat WhatsApp supaya penjual langsung menerimanya.</p>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 pt-3 backdrop-blur md:hidden"
        style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-xs text-ink-2">Total</p>
            <p className="num font-extrabold">{rp(total)}</p>
          </div>
          <button type="submit" className="btn flex-1" disabled={!canSubmit}>{busy ? 'Menyimpan…' : 'Pesan sekarang'}</button>
        </div>
      </div>
    </form>
  );
}
