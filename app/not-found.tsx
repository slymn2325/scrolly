import { headers } from 'next/headers';
import NotFoundView from '@/components/NotFoundView';

export default async function NotFound() {
  const headerList = await headers();
  const requested =
    headerList.get('x-scrolly-lang') || headerList.get('x-middleware-request-x-scrolly-lang');
  const lang = requested === 'en' ? 'en' : 'tr';
  return <NotFoundView lang={lang} />;
}
