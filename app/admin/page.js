import { redirect } from 'next/navigation';

// Jalur lama /admin dialihkan ke halaman penjual.
export default function Admin() {
  redirect('/penjual');
}
