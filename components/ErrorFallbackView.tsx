'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Home, RotateCcw } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/icons8Assets';

interface ErrorFallbackViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  lang?: Language;
}

export default function ErrorFallbackView({
  error,
  reset,
  lang = 'tr',
}: ErrorFallbackViewProps) {
  useEffect(() => {
    console.error('[Scrolly Error Boundary]:', error);
  }, [error]);

  const isEn = lang === 'en';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF9] px-4 py-16 text-center text-ink dark:bg-[#0A0A0E] dark:text-[#F5F3FF]">
      <div className="w-full max-w-md rounded-3xl border-2 border-amber-200/90 bg-white p-8 shadow-xl dark:border-white/15 dark:bg-[#17122B]">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100/90 via-rose-50 to-orange-100/80 p-3 shadow-sm dark:from-amber-950/60 dark:via-rose-950/50 dark:to-orange-950/40">
          <img
            src={STATE_ILLUSTRATION_PATHS.errorWarning}
            alt={isEn ? 'Temporary issue shield illustration' : 'Geçici uyarı kalkanı illüstrasyonu'}
            width={80}
            height={80}
            decoding="async"
            className="h-20 w-20 object-contain drop-shadow-sm"
          />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink dark:text-white">
          {isEn ? 'Something Went Wrong' : 'Beklenmeyen Bir Hata Oluştu'}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/75 dark:text-violet-200/80">
          {isEn
            ? 'A temporary glitch interrupted this discovery card. You can retry loading right away or return to the feed.'
            : 'Bu keşif sahnesi yüklenirken geçici bir sorun yaşandı. Sayfayı hemen yeniden deneyebilir veya ana akışa dönebilirsin.'}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 dark:hover:bg-violet-500"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>{isEn ? 'Try Again' : 'Tekrar Dene'}</span>
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-ink transition hover:bg-slate-100 dark:border-white/20 dark:bg-white/10 dark:text-violet-100 dark:hover:bg-white/15"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>{isEn ? 'Home' : 'Ana Sayfa'}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
