import Link from 'next/link';
import { Compass, Home, SearchX } from 'lucide-react';
import type { Language } from '@/i18n/translations';

interface NotFoundViewProps {
  lang?: Language;
}

export default function NotFoundView({ lang = 'tr' }: NotFoundViewProps) {
  const isEn = lang === 'en';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF9] px-4 py-16 text-center text-ink">
      <div className="w-full max-w-md rounded-3xl border-2 border-violet-200 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-amber-100 text-violet-700 shadow-sm">
          <SearchX className="h-8 w-8" />
        </div>

        <p className="text-xs font-black uppercase tracking-widest text-violet-700">404</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink">
          {isEn ? 'Discovery Card Not Found' : 'Bu Keşif Kartı Bulunamadı'}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/75">
          {isEn
            ? 'The link may have moved or expired. Jump back into the interactive Reels stream to explore verified science cards.'
            : 'Aradığın kart taşınmış veya bağlantısı değişmiş olabilir. Doğrulanmış mikro bilgi akışına dönerek yeni keşiflere devam edebilirsin.'}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            <span>{isEn ? 'Back to Scrolly Feed' : 'Ana Akışa Dön'}</span>
          </Link>
          <Link
            href={isEn ? '/en/category/space' : '/category/space'}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-900 hover:bg-violet-100"
          >
            <Compass className="h-4 w-4" />
            <span>{isEn ? 'Browse Categories' : 'Kategorileri Gör'}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
