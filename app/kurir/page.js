import { isCourier } from '@/lib/courier-auth';
import CourierApp from '@/components/courier/CourierApp';
import CourierLogin from '@/components/courier/CourierLogin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Kurir · Kaboba Time', robots: { index: false, follow: false } };

export default function CourierPage() {
  return isCourier() ? <CourierApp /> : <CourierLogin />;
}
