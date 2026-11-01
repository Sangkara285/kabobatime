// Menu awal Kaboba Time (dari katalog WhatsApp). Setelah toko jalan, kelola menu lewat halaman /penjual.
// Seed hanya MENAMBAH produk yang belum ada (berdasarkan slug) dan tidak menimpa perubahan penjual.
const KEBAB_HINT = 'Contoh: saos pedas, tanpa bombay';

module.exports = {
  categories: [
    { slug: 'kebab', name: 'Kebab Pedas & Gurih' },
    { slug: 'minuman', name: 'Minuman' },
    { slug: 'ekstra', name: 'Ekstra Topping' },
  ],
  products: [
    { cat: 'kebab', slug: 'kebab-kornet', name: 'Kebab Kornet', price: 8000, image: '/menu/kebab-kornet.jpg', has_addons: 1, featured: 1, note_hint: KEBAB_HINT,
      description: 'Kebab enak dengan harga ekonomis. Isian kornet, sayuran, bombay, saos².' },
    { cat: 'kebab', slug: 'kebab-telur', name: 'Kebab Telur', price: 10000, image: '/menu/kebab-telur.jpg', has_addons: 1, note_hint: 'Telur mau didadar, ceplok, atau orek?',
      description: 'Kebab telur. Bisa request telurnya didadar, ceplok, atau orek.' },
    { cat: 'kebab', slug: 'kebab-chicken-katsu', name: 'Kebab Chicken Katsu', price: 12000, image: '/menu/kebab-chicken-katsu.jpg', has_addons: 1, featured: 1, note_hint: KEBAB_HINT,
      description: 'Isian daging ayam bermutu, full daging ayam dilapisi tepung roti. Pilihan untuk yang tidak suka beef.' },
    { cat: 'kebab', slug: 'kebab-jumbo', name: 'Kebab Jumbo', price: 12000, image: '/menu/kebab-jumbo.jpg', has_addons: 1, featured: 1, note_hint: KEBAB_HINT,
      description: 'Isian campuran kornet, nugget, keju, saos dan sayuran. Rasa nano-nano, pasti ngenyangin.' },
    { cat: 'kebab', slug: 'kebab-beef-shawarma', name: 'Kebab Beef Shawarma', price: 12000, image: '/menu/kebab-beef-shawarma.jpg', has_addons: 1, note_hint: KEBAB_HINT,
      description: 'Daging iris dengan rasa daging yang lebih kuat dan berempah khas Timur Tengah.' },
    { cat: 'kebab', slug: 'kebab-salad', name: 'Kebab Salad Ayam/Beef & Telur', price: 15000, image: '/menu/kebab-salad.jpg', has_addons: 1, note_hint: 'Pilih ayam atau beef; saos salad/pedas/tomat',
      description: 'Dengan saus salad dressing. Bisa request saos pedas atau saos tomat. Kulit kebabnya tidak dipanggang di mentega lagi.' },

    { cat: 'minuman', slug: 'hot-dark-chocolate', name: 'Hot Dark Chocolate', price: 10000, image: '/menu/hot-dark-chocolate.jpg', featured: 1, description: 'Cokelat hangat yang pekat.' },
    { cat: 'minuman', slug: 'ice-dark-chocolate-kecil', name: 'Ice Dark Chocolate (cup kecil)', price: 11000, image: '/menu/ice-dark-chocolate-kecil.jpg', description: 'Cup 16 oz.' },
    { cat: 'minuman', slug: 'ice-dark-chocolate-besar', name: 'Ice Dark Chocolate (cup besar)', price: 15000, image: '/menu/ice-dark-chocolate-besar.jpg', description: 'Cup 22 oz.' },

    { cat: 'ekstra', slug: 'ekstra-beef', name: 'Ekstra Beef', price: 5000, image: '/menu/ekstra-beef.jpg', is_addon: 1, description: 'Ekstra topping untuk kebab.' },
    { cat: 'ekstra', slug: 'ekstra-sosis', name: 'Ekstra Sosis', price: 3000, image: '/menu/ekstra-sosis.jpg', is_addon: 1, description: 'Ekstra topping untuk kebab.' },
    { cat: 'ekstra', slug: 'ekstra-nugget', name: 'Ekstra Nugget', price: 3000, image: '/menu/ekstra-nugget.jpg', is_addon: 1, description: 'Ekstra topping untuk kebab.' },
    { cat: 'ekstra', slug: 'ekstra-kornet', name: 'Ekstra Kornet', price: 3000, image: '/menu/ekstra-kornet.jpg', is_addon: 1, description: 'Ekstra topping untuk isian kebab.' },
    { cat: 'ekstra', slug: 'ekstra-sayur', name: 'Ekstra Sayur', price: 3000, image: '/menu/ekstra-sayur.jpg', is_addon: 1, description: 'Ekstra topping untuk kebab.' },
    { cat: 'ekstra', slug: 'ekstra-telur', name: 'Ekstra Telur', price: 3000, image: '/menu/ekstra-telur.jpg', is_addon: 1, description: 'Ekstra topping telur untuk kebab.' },
    { cat: 'ekstra', slug: 'ekstra-ayam-katsu', name: 'Ekstra Ayam Katsu', price: 5000, image: '/menu/ekstra-katsu.jpg', is_addon: 1, description: 'Ekstra isian untuk kebab.' },
  ],
};
