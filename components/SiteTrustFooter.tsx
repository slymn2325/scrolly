import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { getCategoryMeta, type Language } from '@/i18n/translations';
import { CATEGORY_ROUTE_SLUGS, categoryRouteSlugToId } from '@/utils/factsData';

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
            <div className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink dark:text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
                href={`/category/${slug}${langSuffix}`}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-[#FFFDF9] px-2.5 py-1 font-bold text-ink/80 transition hover:border-violet-300 hover:text-violet-700 dark:border-white/15 dark:bg-white/5 dark:text-violet-100"
              >
                <span>{meta.emoji}</span>
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
    </footer>
  );
}
