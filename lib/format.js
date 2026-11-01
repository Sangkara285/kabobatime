export const rp = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
export const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

export const STATUS_LABEL = { baru: 'Baru', diproses: 'Diproses', siap: 'Siap', selesai: 'Selesai', batal: 'Dibatalkan' };
export const statusLabel = (status, mode) =>
  status === 'siap' ? (mode === 'antar' ? 'Sedang diantar' : 'Siap diambil') : STATUS_LABEL[status] || status;

export const PAY_STATUS = {
  belum: 'Belum ada bukti',
  menunggu: 'Menunggu verifikasi',
  terverifikasi: 'Pembayaran terverifikasi',
  ditolak: 'Bukti ditolak',
};

// Nomor WhatsApp dalam format 62...
export const intlPhone = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
};
