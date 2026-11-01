import { redirect } from 'next/navigation';
import { isSeller } from '@/lib/auth';
import OrderDetail from '@/components/seller/OrderDetail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Detail pesanan · Penjual', robots: { index: false, follow: false } };

export default function SellerOrderPage({ params }) {
  if (!isSeller()) redirect('/penjual');
  return <OrderDetail code={String(params.code).toUpperCase()} />;
}
