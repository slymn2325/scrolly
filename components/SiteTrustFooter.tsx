import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import {
  buildCategoryHref,
  CATEGORY_ROUTE_SLUGS,
  categoryRouteSlugToId,
} from '@/utils/factsData';
import { UI_ICON_PATHS } from '@/utils/icons8Assets';

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
        { href: `/about${langSuffix}`, label: 'About Us' },
        { href: '/privacy', label: 'Privacy & Cookies' },
        { href: `/terms${langSuffix}`, label: 'Terms of Use' },
        { href: `/contact${langSuffix}`, label: 'Contact' },
      ]
    : [
        { href: '/about', label: 'Hakkımızda' },
        { href: '/privacy', label: 'Gizlilik ve Çerez Politikası' },
        { href: '/terms', label: 'Kullanım Koşulları' },
        { href: '/contact', label: 'İletişim' },
      ];

  return (
    <footer
      aria-label={isEn ? 'Site information and legal links' : 'Site bilgileri ve yasal bağlantılar'}
      className={`mt-10 border-t border-amber-200/70 bg-white/85 px-4 py-8 text-xs text-ink/75 dark:border-white/10 dark:bg-[#141024]/90 dark:text-violet-100/80 ${className}`}
    >
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-lg space-y-1.5">
            <div className="inline-flex items-center gap-2 font-display text-sm font-bold text-ink dark:text-white">
              <img
                src={UI_ICON_PATHS.verifiedSeal}
                alt=""
                aria-hidden="true"
                width={18}
                height={18}
                decoding="async"
                className="h-[18px] w-[18px] object-contain"
              />
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Scrolly • scrolly.live</span>
            </div>
            <p className="leading-relaxed text-ink/70 dark:text-violet-200/75">
              {isEn
                ? 'Bilingual micro-learning platform built on verifiable scientific sources (NASA, Nature, PubMed, Smithsonian, Britannica). Content is regularly reviewed for factual clarity.'
                : 'NASA, Nature, PubMed, Smithsonian ve Britannica gibi doğrulanabilir bilimsel kaynaklara dayalı iki dilli mikro öğrenme platformu. İçerikler bilimsel doğruluk için düzenli olarak gözden geçirilir.'}
            </p>
          </div>

          <nav
            aria-label={isEn ? 'Trust & Legal' : 'Kurumsal ve Yasal'}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 font-bold"
          >
            {trustLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-violet-700 hover:underline dark:text-violet-300"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="mailto:contact@scrolly.live"
              data-testid="footer-contact-email"
              className="text-emerald-700 underline underline-offset-4 hover:text-emerald-900 dark:text-emerald-300"
            >
              contact@scrolly.live
            </a>
          </nav>
        </div>

        <nav
          aria-label={isEn ? 'Explore Categories' : 'Kategorileri Keşfet'}
          className="flex flex-wrap items-center gap-2 border-t border-amber-100/90 pt-4 dark:border-white/10"
        >
          <span className="mr-1 font-extrabold uppercase tracking-wider text-ink/55 dark:text-violet-300/65">
            {isEn ? 'Topics:' : 'Konular:'}
          </span>
          {CATEGORY_ROUTE_SLUGS.map((slug) => {
            const catId = categoryRouteSlugToId(slug)!;
            const meta = getCategoryMeta(catId);
            return (
              <Link
                key={slug}
                href={buildCategoryHref(slug, isEn ? 'en' : 'tr')}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-200/80 bg-[#FFFDF9] px-3 py-1.5 font-bold text-ink/80 transition hover:border-violet-300 hover:text-violet-700 dark:border-white/15 dark:bg-white/5 dark:text-violet-100"
              >
                <img
                  src={meta.iconPath}
                  alt=""
                  aria-hidden="true"
                  width={14}
                  height={14}
                  decoding="async"
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span>{meta.label[lang]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink/55 dark:text-violet-200/60">
          <span>
            © 2026 Scrolly (scrolly.live) —{' '}
            {isEn ? 'All rights reserved.' : 'Tüm hakları saklıdır.'}
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {isEn ? 'Icons & 3D art by' : 'İkonlar ve 3D çizimler:'}{' '}
              <a
                href="https://icons8.com"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-bold text-ink/75 underline decoration-ink/25 underline-offset-2 hover:text-violet-700 dark:text-violet-200/80 dark:hover:text-violet-300"
              >
                Icons8
              </a>
            </span>
            <span>
              {isEn ? 'Editorial Contact:' : 'Editöryal İletişim:'}{' '}
              <a
                href="mailto:contact@scrolly.live"
                className="font-bold text-violet-700 hover:underline dark:text-violet-300"
              >
                contact@scrolly.live
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
