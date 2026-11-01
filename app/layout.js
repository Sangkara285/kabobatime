import './globals.css';

export const metadata = {
  title: 'Kaboba Time',
  description: 'Pesan kebab dan es cokelat dari Kaboba Time, antar atau ambil sendiri. Pesanan langsung masuk ke WhatsApp.',
  appleWebApp: { capable: true, title: 'Kaboba Time', statusBarStyle: 'default' },
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#B85306' };

// Menerapkan tema sebelum halaman tampil supaya tidak ada kedipan terang saat mode gelap.
const THEME_INIT = `try{var t=localStorage.getItem('kbt_theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=DM+Mono:wght@500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
