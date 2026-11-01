'use client';
import { useRouter } from 'next/navigation';

// Tombol Kembali yang sama di semua halaman. Dengan onBack, aksinya diserahkan ke komponen induk.
export default function BackButton({ href = '/', onBack, label = 'Kembali' }) {
  const router = useRouter();
  function go(e) {
    e.preventDefault();
    if (onBack) { onBack(); return; }
    const sameSite = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin);
    if (window.history.length > 1 && sameSite) router.back();
    else router.push(href);
  }
  return (
    <a href={href} onClick={go} className="inline-flex min-h-11 items-center gap-2 self-start rounded-full px-4 font-semibold text-ink ring-1 ring-inset ring-line hover:bg-brand-soft">
      <span aria-hidden>←</span> {label}
    </a>
  );
}
