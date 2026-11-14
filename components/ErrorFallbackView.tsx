'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import type { Language } from '@/i18n/translations';

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFDF9] px-4 py-16 text-center text-ink">
      <div className="w-full max-w-md rounded-3xl border-2 border-rose-200 bg-white p-8 shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-sm">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink">
          {isEn ? 'Something Went Wrong' : 'Beklenmeyen Bir Hata Oluştu'}
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink/75">
          {isEn
            ? 'A temporary glitch interrupted this discovery card. You can retry loading right away or return to the feed.'
            : 'Bu keşif sahnesi yüklenirken geçici bir sorun yaşandı. Sayfayı hemen yeniden deneyebilir veya ana akışa dönebilirsin.'}
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{isEn ? 'Try Again' : 'Tekrar Dene'}</span>
          </button>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-ink hover:bg-slate-100"
          >
            <Home className="h-4 w-4" />
            <span>{isEn ? 'Home' : 'Ana Sayfa'}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
