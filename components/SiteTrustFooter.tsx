import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import {
  buildCategoryHref,
  CATEGORY_ROUTE_SLUGS,
  categoryRouteSlugToId,
} from '@/utils/factsData';

interface SiteTrustFooterProps {
  lang?: Language;
  className?: string;
}

export default function SiteTrustFooter({
  lang = 'tr',
  className = '',
}: SiteTrustFooterProps) {
  const isEn = lang === 'en';
  const langSuffix = isEn ? '?lang=en' : '';

  const trustLinks = isEn
    ? [
        { href: `/about${langSuffix}`, label: 'About' },
        { href: '/privacy', label: 'Privacy' },
        { href: `/terms${langSuffix}`, label: 'Terms' },
        { href: `/contact${langSuffix}`, label: 'Contact' },
      ]
    : [
        { href: '/about', label: 'Hakkımızda' },
        { href: '/privacy', label: 'Gizlilik' },
        { href: '/terms', label: 'Koşullar' },
        { href: '/contact', label: 'İletişim' },
      ];

  return (
    <footer
      lang={isEn ? 'en-US' : 'tr-TR'}
      aria-label={isEn ? 'Site information' : 'Site bilgisi'}
      className={`mt-10 border-t border-cik-line bg-cik-bg px-4 py-8 text-cik-text-2 ${className}`}
    >
      <div className="mx-auto max-w-[42.5rem] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-lg space-y-2">
            <div className="cik-headline inline-flex items-center gap-2 text-cik-text">
              <ShieldCheck className="h-5 w-5 text-cik-cta" aria-hidden="true" />
              <span>Scrolly · scrolly.live</span>
            </div>
            <p className="cik-footnote text-cik-text-2">
              {isEn
                ? 'Bilingual micro-learning built on sources you can check, including NASA, Nature, PubMed, Smithsonian, and Britannica.'
                : 'NASA, Nature, PubMed, Smithsonian ve Britannica gibi kontrol edilebilir kaynaklara dayanan iki dilli mikro öğrenme.'}
            </p>
          </div>

          <nav aria-label={isEn ? 'Legal' : 'Yasal'} className="cik-footnote flex flex-wrap items-center gap-x-4 gap-y-2">
            {trustLinks.map((item) => (
              <Link key={item.href} href={item.href} className="text-cik-cta">
                {item.label}
              </Link>
            ))}
            <a href="mailto:contact@scrolly.live" data-testid="footer-contact-email" className="text-cik-cta">
              contact@scrolly.live
            </a>
          </nav>
        </div>

        <nav
          aria-label={isEn ? 'Topics' : 'Konular'}
          className="flex flex-wrap items-center gap-2 border-t border-cik-line pt-4"
        >
          <span lang={isEn ? 'en' : 'tr'} className="cik-caption-1 text-cik-text-2">
            {isEn ? 'Topics' : 'Konular'}
          </span>
          {CATEGORY_ROUTE_SLUGS.map((slug) => {
            const catId = categoryRouteSlugToId(slug)!;
            const meta = getCategoryMeta(catId);
            return (
              <Link
                key={slug}
                href={buildCategoryHref(slug, isEn ? 'en' : 'tr')}
                className="cik-footnote inline-flex h-11 items-center gap-2 rounded-pill border border-cik-line bg-cik-surface px-3 text-cik-text"
              >
                <img
                  src={meta.iconPath}
                  alt=""
                  aria-hidden="true"
                  width={24}
                  height={24}
                  decoding="async"
                  className="h-6 w-6 shrink-0 object-contain"
                />
                <span>{meta.label[lang]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="cik-caption-2 flex flex-wrap items-center justify-between gap-2 text-cik-text-3">
          <span>© 2026 Scrolly · scrolly.live</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {isEn ? 'Art' : 'Çizimler'}:{' '}
              <a
                href="https://github.com/microsoft/fluentui-emoji"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cik-text-2 underline decoration-cik-line underline-offset-2"
              >
                Microsoft Fluent Emoji (MIT)
              </a>
            </span>
            <span>
              {isEn ? 'Editorial' : 'Editöryal'}:{' '}
              <a href="mailto:contact@scrolly.live" className="text-cik-cta">
                contact@scrolly.live
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
