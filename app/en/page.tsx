import HomeScreen from '@/components/HomeScreen';
import { buildHomeMetadata } from '@/lib/homeMetadata';

export const dynamic = 'force-dynamic';
export const metadata = buildHomeMetadata('en');

export default function EnglishHomePage() {
  return <HomeScreen lang="en" />;
}
