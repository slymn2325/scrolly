import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/fluentAssets';

interface NotFoundViewProps {
  lang?: Language;
}

export default function NotFoundView({ lang = 'tr' }: NotFoundViewProps) {
  const isEn = lang === 'en';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cik-bg px-4 py-16 text-center text-cik-text">
      <div className="w-full max-w-md rounded-sticker border border-cik-line bg-cik-surface p-5 shadow-e1">
        <img
          src={STATE_ILLUSTRATION_PATHS.notFound}
          alt=""
          width={72}
          height={72}
          decoding="async"
          className="mx-auto h-[72px] w-[72px] object-contain"
        />

        <p className="cik-caption-1 mt-4 text-cik-text-2">404</p>
        <h1 className="cik-title-1 mt-2 text-cik-text">
          {isEn ? 'This card is not here' : 'Bu kart burada değil'}
        </h1>
        <p className="cik-body mt-3 text-cik-text-2">
          {isEn
            ? 'The link may have moved. Head back to the feed and keep exploring.'
            : 'Bağlantı taşınmış olabilir. Akışa dönüp keşfetmeye devam edebilirsin.'}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="cik-headline inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>{isEn ? 'Back to feed' : 'Akışa dön'}</span>
          </Link>
          <Link
            href={isEn ? '/en/category/space' : '/category/space'}
            className="cik-headline inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-4 text-cik-text"
          >
            <Compass className="h-5 w-5" aria-hidden="true" />
            <span>{isEn ? 'Browse topics' : 'Konulara bak'}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
