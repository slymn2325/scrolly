import HomeScreen from '@/components/HomeScreen';
import { buildHomeMetadata } from '@/lib/homeMetadata';

export const dynamic = 'force-dynamic';
export const metadata = buildHomeMetadata('tr');

export default function HomePage() {
  return <HomeScreen lang="tr" />;
}
