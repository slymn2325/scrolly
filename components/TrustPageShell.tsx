import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import HtmlLangSync from '@/components/HtmlLangSync';
import ProfileReturnControl from '@/components/ProfileReturnControl';
import SiteTrustFooter from '@/components/SiteTrustFooter';
import type { Language } from '@/i18n/translations';

interface TrustPageShellProps {
  routePath: '/about' | '/terms' | '/contact';
  lang: Language;
  badge: string;
  title: string;
  updatedLabel: string;
  breadcrumbLabel: string;
  returnToProfile?: boolean;
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
  returnToProfile = false,
  jsonLd,
  children,
}: TrustPageShellProps) {
  const isEn = lang === 'en';
  const langHref = (code: 'tr' | 'en') => {
    const params = new URLSearchParams({ lang: code });
    if (returnToProfile) params.set('from', 'profile');
    return `${routePath}?${params.toString()}`;
  };

  return (
    <>
      <HtmlLangSync lang={lang} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <div lang={isEn ? 'en-US' : 'tr-TR'} className="min-h-dvh w-full overflow-x-clip bg-cik-bg text-cik-text">
        <header className="material-thin sticky top-0 z-hud border-b border-cik-line">
          <div className="mx-auto flex max-w-[42.5rem] items-center justify-between gap-3 px-4 py-3">
            <ProfileReturnControl
              returnToProfile={returnToProfile}
              className="cik-footnote inline-flex h-11 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-4 text-cik-text"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              <span>
                {returnToProfile
                  ? isEn
                    ? 'Back to Profile'
                    : 'Profile dön'
                  : isEn
                    ? 'Back to feed'
                    : 'Akışa dön'}
              </span>
            </ProfileReturnControl>

            <div
              role="group"
              aria-label={isEn ? 'Language' : 'Dil'}
              className="inline-flex items-center gap-1 rounded-pill border border-cik-line bg-cik-surface p-1"
            >
              <Link
                href={langHref('tr')}
                aria-current={lang === 'tr' ? 'page' : undefined}
                data-testid="trust-lang-tr"
                className={`cik-footnote inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 ${
                  lang === 'tr' ? 'bg-cik-berry text-cik-on-berry' : 'text-cik-text-2'
                }`}
              >
                TR
              </Link>
              <Link
                href={langHref('en')}
                aria-current={lang === 'en' ? 'page' : undefined}
                data-testid="trust-lang-en"
                className={`cik-footnote inline-flex h-11 min-w-11 items-center justify-center rounded-pill px-3 ${
                  lang === 'en' ? 'bg-cik-berry text-cik-on-berry' : 'text-cik-text-2'
                }`}
              >
                EN
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[42.5rem] px-4 pb-8 pt-6">
          <nav aria-label="Breadcrumb" className="cik-footnote mb-4 flex items-center gap-2 text-cik-text-2">
            <ProfileReturnControl
              returnToProfile={returnToProfile}
              className="inline-flex items-center gap-1 text-cik-text"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{isEn ? 'Home' : 'Ana sayfa'}</span>
            </ProfileReturnControl>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-cik-text">{breadcrumbLabel}</span>
          </nav>

          <article className="rounded-sticker border border-cik-line bg-cik-surface p-5 shadow-e1">
            <p className="cik-footnote inline-flex rounded-pill bg-cik-pink px-3 py-1 text-cik-text">{badge}</p>
            <h1 className="cik-title-1 mt-3 text-cik-text">{title}</h1>
            <p className="cik-caption-1 mt-2 text-cik-text-2">{updatedLabel}</p>
            <div className="cik-body mt-6 space-y-6 text-cik-text">{children}</div>
          </article>
        </main>

        <SiteTrustFooter lang={lang} />
      </div>
    </>
  );
}
