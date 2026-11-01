# Kaboba Time: website pesan antar

Next.js 14 (App Router) + Tailwind CSS + Node.js (API routes) + MySQL.

## Alur
1. Pelanggan memilih menu (kebab bisa tambah ekstra topping dan catatan), memilih **antar** atau **ambil sendiri**.
2. Untuk antar, pelanggan menandai titik di peta (atau "Pakai lokasi saya"). Ongkir otomatis: **gratis bila jarak di bawah 1 km**, selain itu **jarak (km, dibulatkan ke atas) x Rp1.000**. Di luar jangkauan maksimal, pesanan ditolak dengan pesan jelas.
3. Tombol **Pesan sekarang** menyimpan pesanan ke MySQL dan memberi **kode order** (contoh `KBT-2010-AB7K`). Harga, stok, dan ongkir selalu dihitung ulang di server.
4. Di halaman kode order ada tombol **Kirim pesanan ke WhatsApp**: membuka chat ke nomor penjual dengan pesan lengkap (kode order, jarak, link Google Maps titik antar, daftar pesanan, total).
5. Penjual membuka `/penjual`, melihat pesanan dan kodenya, lalu mengubah status. Pelanggan melacak status di `/order/<kode>`.

## Halaman penjual (`/penjual`)
- **Pesanan**: daftar otomatis diperbarui tiap 8 detik, bunyi dan angka di judul tab saat ada pesanan baru, tombol ubah status, tombol chat pembeli, link Maps.
- **Produk (CRUD lengkap)**: tambah, edit, hapus, urutkan naik/turun, unggah foto (JPG/PNG/WebP, maks 4 MB), pilih kategori, tandai "Paling Laris", tandai topping ekstra.
- **Habis / Kosong**: tombol "Tandai habis" memilih label **Habis** atau **Kosong** plus keterangan untuk pembeli (contoh: "kembali besok jam 10"). Di toko produk itu tampil abu-abu dengan label, tidak bisa dipesan, dan muncul di banner "Sedang tidak tersedia". Pembeli yang sudah memasukkannya ke keranjang diberi tahu dan tidak bisa checkout sebelum menghapusnya. Server juga menolak pesanan yang berisi produk habis.
- **Kategori**: tambah, ubah nama, urutkan, hapus (ditolak bila masih berisi produk).
- **Pengaturan**: nomor WhatsApp penjual, jam buka, koordinat outlet, ongkir per km, jangkauan maksimal, gratis ongkir (opsional).
- Diskon global dapat diatur penjual dalam persen dari subtotal. Rekap pendapatan memisahkan pendapatan kotor, diskon, dan pendapatan bersih. Hari operasional berganti pukul 16.00.
- Pembayaran yang tersedia adalah tunai dan QRIS. Untuk tunai, penjual mencatat uang diterima dan sistem menghitung kembalian.

## Menjalankan di Windows (PowerShell)
Prasyarat: Node.js 18 atau lebih baru dan MySQL yang menyala (XAMPP, Laragon, atau MySQL Server).

```powershell
cd <folder proyek>            # folder yang berisi package.json
cp .env.example .env.local    # lalu isi MYSQL_*, SELLER_PASSWORD, SESSION_SECRET, OUTLET_LAT, OUTLET_LNG
npm install
npm run db:setup              # buat database, tabel, migrasi, dan isi menu awal
npm run dev                   # http://localhost:3000
```
Produksi: `npm run build` lalu `npm start`.

`npm run db:setup` aman dijalankan berulang: tidak menghapus data dan tidak menimpa perubahan yang dibuat penjual (menu awal hanya ditambahkan bila belum ada).

## Yang WAJIB kamu isi
- `OUTLET_LAT` / `OUTLET_LNG` (atau di `/penjual` > Pengaturan): koordinat outlet yang tepat. Nilai awal hanya perkiraan area Lemah Abang, Karawang, sehingga ongkir akan meleset bila tidak diganti. Di Google Maps, tekan lama di lokasi outlet lalu salin dua angka koordinatnya.
- `SELLER_PASSWORD` dan `SESSION_SECRET`: ganti dengan nilai sendiri.
- Foto ekstra topping bawaan beresolusi rendah; ganti lewat edit produk.

## Catatan teknis
- Jarak jalan memakai OSRM publik (gratis, tanpa API key). Bila gagal atau lambat (>4 detik), dipakai jarak garis lurus x 1,3. Peta memakai OpenStreetMap. Untuk trafik tinggi, pertimbangkan server OSRM sendiri.
- Foto unggahan disimpan di folder `uploads/` dan disajikan lewat `/api/uploads/<file>`. Jenis file diperiksa dari isinya, bukan dari ekstensi. Folder ini perlu ikut dibackup.
- Foto bawaan ada di `public/menu/`.
- Menambah menu awal lewat kode: edit `lib/seed-data.js` lalu `npm run db:setup`. Cara paling mudah tetap lewat `/penjual`.

## Pembayaran tunai dan QRIS
- Taruh gambar QRIS penjual di `public/qris.png`. Pembeli yang memilih QRIS melihat gambar itu setelah memesan, bisa mengunduhnya dalam ukuran asli, lalu mengunggah bukti pembayaran.
- Pembayaran tunai dicatat penjual dengan jumlah uang diterima; sistem menghitung kembalian. Bukti QRIS disimpan di `uploads/proofs/` dan hanya bisa dibuka oleh penjual yang sudah masuk (`/api/seller/proofs/...`). Pembeli tidak pernah menerima alamat file itu.
- Penjual membuka detail pesanan (ketuk kartu pesanan), memperbesar bukti, lalu memverifikasi atau menolaknya dengan alasan yang terlihat pembeli.
- Tombol "Kirim detail pesanan ke WhatsApp penjual" membuka chat seller dengan detail pesanan. Foto bukti tetap tersedia di dashboard seller; WhatsApp tidak dapat melampirkan foto otomatis dari tautan web.

## Tema terang dan gelap
Tombol matahari/bulan di header mengganti tema. Pilihan disimpan di browser. Warna diatur di `app/globals.css` (variabel seperti `--ink` dan `--brand`) dan dipetakan di `tailwind.config.js`. Hero memakai warna tetap (`hero-*`) sehingga tidak ikut berbalik saat mode gelap.

## Sebelum mengedit kode
Gunakan git: `git init`, lalu `git add -A` dan `git commit` setiap kali satu langkah selesai. Jangan menghapus folder dengan perintah rekursif di PowerShell, terutama path yang mengandung `[code]`: tanda kurung ditafsirkan sebagai wildcard dan bisa menghapus lebih dari yang dimaksud.
