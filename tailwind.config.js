/** @type {import('tailwindcss').Config} */
// Warna memakai variabel CSS (lihat app/globals.css) sehingga mode gelap cukup mengganti nilainya.
// Hero memakai warna tetap (hero-*) agar tidak ikut berbalik saat mode gelap.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('ink'),
        'ink-2': v('ink-2'),
        paper: v('paper'),
        card: v('card'),
        line: v('line'),
        accent: v('accent'),
        brand: { DEFAULT: v('brand'), dark: v('brand-dark'), soft: v('brand-soft') },
        leaf: { DEFAULT: v('leaf'), soft: v('leaf-soft'), btn: v('leaf-btn') },
        warn: { DEFAULT: v('warn'), text: v('warn-text'), soft: v('warn-soft') },
        sky: { DEFAULT: v('sky'), soft: v('sky-soft') },
        hero: { DEFAULT: '#2A1B12', ink: '#FAF6F0', muted: '#E8D5C4', accent: '#FF9A4D', chip: 'rgba(0,0,0,0.28)' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Trebuchet MS', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
