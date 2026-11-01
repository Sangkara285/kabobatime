import { isSeller } from '@/lib/auth';
import SellerApp from '@/components/seller/SellerApp';
import SellerLogin from '@/components/seller/SellerLogin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Penjual · Kaboba Time', robots: { index: false, follow: false } };

// Pemeriksaan dilakukan di server: kode dashboard tidak dikirim ke pembeli yang belum masuk.
export default function SellerPage() {
  return isSeller() ? <SellerApp /> : <SellerLogin />;
}
