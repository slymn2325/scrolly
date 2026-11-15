import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';

interface NotFoundViewProps {
  lang?: Language;
}

export default function NotFoundView({ lang = 'tr' }: NotFoundViewProps) {
  const isEn = lang === 'en';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF9] px-4 py-16 text-center text-ink dark:bg-[#0A0A0E] dark:text-[#F5F3FF]">
      <div className="w-full max-w-md rounded-3xl border-2 border-violet-200/90 bg-white p-8 shadow-xl dark:border-white/15 dark:bg-[#17122B]">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100/90 via-indigo-50 to-amber-100/80 p-3 shadow-sm dark:from-violet-950/80 dark:via-indigo-950/60 dark:to-amber-950/40">
          <img
            src={STATE_ILLUSTRATION_PATHS.notFound}
            alt={isEn ? 'Exploration binoculars illustration' : 'Keşif dürbünü illüstrasyonu'}
            width={80}
            height={80}
            decoding="async"
            className="h-20 w-20 object-contain drop-shadow-sm"
          />
        </div>

        <p className="text-xs font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
          404
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink dark:text-white">
          {isEn ? 'Discovery Card Not Found' : 'Bu Keşif Kartı Bulunamadı'}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/75 dark:text-violet-200/80">
          {isEn
            ? 'The link may have moved or expired. Jump back into the interactive Reels stream to explore verified science cards.'
            : 'Aradığın kart taşınmış veya bağlantısı değişmiş olabilir. Doğrulanmış mikro bilgi akışına dönerek yeni keşiflere devam edebilirsin.'}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>{isEn ? 'Back to Scrolly Feed' : 'Ana Akışa Dön'}</span>
          </Link>
          <Link
            href={isEn ? '/en/category/space' : '/category/space'}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-900 transition hover:bg-violet-100 dark:border-white/20 dark:bg-white/10 dark:text-violet-100 dark:hover:bg-white/15"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>{isEn ? 'Browse Categories' : 'Kategorileri Gör'}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
