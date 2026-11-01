import Shop from '@/components/Shop';
import { getMenu } from '@/lib/menu';
import { getSettings, publicSettings } from '@/lib/settings';
import { STORE } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let menu = { categories: [], addons: [], featured: [] }, error = false;
  const settings = publicSettings(await getSettings());
  try { menu = await getMenu(); } catch (e) { console.error(e); error = true; }
  return <Shop menu={menu} error={error} store={STORE} settings={settings} />;
}
