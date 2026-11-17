import type { Metadata } from 'next';
import { headers } from 'next/headers';
import NotFoundView from '@/components/NotFoundView';
import type { Language } from '@/i18n/translations';

async function requestLanguage(): Promise<Language> {
  const headerList = await headers();
  const requested =
    headerList.get('x-scrolly-lang') || headerList.get('x-middleware-request-x-scrolly-lang');
  return requested === 'en' ? 'en' : 'tr';
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await requestLanguage();
  if (lang === 'en') {
    const title = 'Page not found | Scrolly';
    const description = 'That page is not on Scrolly. Head back to the English home to keep exploring.';
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: 'Scrolly',
        locale: 'en_US',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  }
  const title = 'Sayfa bulunamadı | Scrolly';
  const description = 'Bu sayfa Scrolly’de yok. Keşfe ana sayfadan devam edebilirsin.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'Scrolly',
      locale: 'tr_TR',
      type: 'website',
    },
  };
}

export default async function NotFound() {
  const lang = await requestLanguage();
  return <NotFoundView lang={lang} />;
}
