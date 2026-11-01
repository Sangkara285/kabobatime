export default function manifest() {
  return {
    name: 'Kaboba Penjual',
    short_name: 'Penjual',
    description: 'Dashboard penjual Kaboba Time',
    start_url: '/penjual',
    display: 'standalone',
    background_color: '#FAF6F0',
    theme_color: '#B85306',
    icons: [{ src: '/logo.jpg', sizes: '512x512', type: 'image/jpeg' }],
  };
}
