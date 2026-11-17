'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Home, RotateCcw } from 'lucide-react';
import type { Language } from '@/i18n/translations';
import { STATE_ILLUSTRATION_PATHS } from '@/utils/fluentAssets';

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
    <main className="flex min-h-screen flex-col items-center justify-center bg-cik-bg px-4 py-16 text-center text-cik-text">
      <div className="w-full max-w-md rounded-sticker border border-cik-line bg-cik-surface p-5 shadow-e1">
        <img
          src={STATE_ILLUSTRATION_PATHS.errorWarning}
          alt=""
          width={72}
          height={72}
          decoding="async"
          className="mx-auto h-[72px] w-[72px] object-contain"
        />

        <h1 className="cik-title-1 mt-4 text-cik-text">
          {isEn ? 'Something went wrong' : 'Bir şeyler ters gitti'}
        </h1>
        <p className="cik-body mt-3 text-cik-text-2">
          {isEn ? 'Try again.' : 'Tekrar dene.'}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="cik-headline inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-cik-cta px-4 text-cik-on-cta"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            <span>{isEn ? 'Try again' : 'Tekrar dene'}</span>
          </button>
          <Link
            href="/"
            className="cik-headline inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-4 text-cik-text"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>{isEn ? 'Home' : 'Ana sayfa'}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
