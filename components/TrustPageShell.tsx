import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import HtmlLangSync from '@/components/HtmlLangSync';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import type { Language } from '@/i18n/translations';

interface TrustPageShellProps {
  routePath: '/about' | '/terms' | '/contact';
  lang: Language;
  badge: string;
  title: string;
  updatedLabel: string;
  breadcrumbLabel: string;
  jsonLd: Record<string, unknown>;
  children: React.ReactNode;
}

export default function TrustPageShell({
  routePath,
  lang,
  badge,
  title,
  updatedLabel,
  breadcrumbLabel,
  jsonLd,
  children,
}: TrustPageShellProps) {
  const isEn = lang === 'en';

  return (
    <>
      <HtmlLangSync lang={lang} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <div
        lang={isEn ? 'en-US' : 'tr-TR'}
        className="min-h-dvh w-full overflow-x-clip overflow-y-auto bg-[#FFFDF9] text-ink dark:bg-[#0D0A19] dark:text-white"
      >
        <header className="sticky top-0 z-30 border-b border-amber-100/90 bg-[#FFFDF9]/95 backdrop-blur-md dark:border-white/10 dark:bg-[#0D0A19]/95">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-xs font-extrabold text-ink shadow-sm transition-colors duration-150 hover:bg-amber-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{isEn ? 'Back to Scrolly Feed' : 'Scrolly Akışına Dön'}</span>
            </Link>

            <div
              role="group"
              aria-label={isEn ? 'Language switcher' : 'Dil seçici'}
              className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-white p-0.5 text-xs font-black shadow-sm dark:border-white/15 dark:bg-white/10"
            >
              <Link
                href={`${routePath}?lang=tr`}
                aria-current={lang === 'tr' ? 'page' : undefined}
                data-testid="trust-lang-tr"
                className={`inline-flex min-h-[30px] min-w-[38px] items-center justify-center rounded-full px-3 py-1 transition-colors duration-150 ${
                  lang === 'tr'
                    ? 'bg-[#1E1B2E] text-white shadow-sm dark:bg-white dark:text-[#09090B]'
                    : 'text-[#1E1B2E]/75 hover:text-[#1E1B2E] dark:text-white/80 dark:hover:text-white'
                }`}
              >
                TR
              </Link>
              <Link
                href={`${routePath}?lang=en`}
                aria-current={lang === 'en' ? 'page' : undefined}
                data-testid="trust-lang-en"
                className={`inline-flex min-h-[30px] min-w-[38px] items-center justify-center rounded-full px-3 py-1 transition-colors duration-150 ${
                  lang === 'en'
                    ? 'bg-[#1E1B2E] text-white shadow-sm dark:bg-white dark:text-[#09090B]'
                    : 'text-[#1E1B2E]/75 hover:text-[#1E1B2E] dark:text-white/80 dark:hover:text-white'
                }`}
              >
                EN
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pt-6 sm:pt-10">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-ink/65 dark:text-violet-200/70"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-violet-700 hover:underline"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{isEn ? 'Home' : 'Ana Sayfa'}</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-ink/40" />
            <span className="font-bold text-ink dark:text-white">{breadcrumbLabel}</span>
          </nav>

          <article className="rounded-3xl border-2 border-amber-200/90 bg-white p-6 shadow-xl dark:border-violet-800/40 dark:bg-[#171228] sm:p-9">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold text-violet-800 dark:bg-violet-900/60 dark:text-violet-200">
              <span>{badge}</span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold text-ink dark:text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-xs font-bold text-ink/55 dark:text-violet-200/65">
              {updatedLabel}
            </p>

            <div className="mt-6 space-y-6">{children}</div>
          </article>
        </main>

        <SiteTrustFooter lang={lang} />
      </div>
    </>
  );
}
