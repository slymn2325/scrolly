import React from 'react';
import Link from 'next/link';
import HomeClient from '@/components/HomeClient';
import { getCategoryMeta } from '@/i18n/translations';
import { fetchVocabularyWithSourceServer, getAllFactsServer } from '@/lib/db';
import {
  buildCategoryHref,
  buildFactHref,
  CATEGORY_ROUTE_SLUGS,
  categoryRouteSlugToId,
  getFactPrimarySlug,
  interleaveFactsByCategory,
} from '@/utils/factsData';
import { formatPhoneticForDisplay } from '@/utils/phoneticDisplay';

const TRUST_LINKS = [
  { href: '/about', tr: 'Hakkımızda', en: 'About Us' },
  { href: '/privacy', tr: 'Gizlilik ve Çerez Politikası', en: 'Privacy Policy' },
  { href: '/terms', tr: 'Kullanım Koşulları', en: 'Terms of Use' },
  { href: '/contact', tr: 'İletişim', en: 'Contact' },
] as const;

export default async function HomeScreen({ lang }: { lang: 'tr' | 'en' }) {
  const [allFacts, { vocabulary: rawVocabulary }] = await Promise.all([
    getAllFactsServer(),
    fetchVocabularyWithSourceServer(),
  ]);
  const initialFacts = interleaveFactsByCategory(allFacts).slice(0, 36);
  const initialVocabulary = rawVocabulary.map((card) => ({
    ...card,
    phonetic: formatPhoneticForDisplay(card.phonetic),
  }));
  const isEn = lang === 'en';

  return (
    <>
      <h1 className="sr-only">
        {isEn
          ? 'Scrolly — Verified bilingual micro cards for science, space, history, and culture'
          : 'Scrolly — Doğrulanmış İki Dilli Mikro Bilim, Uzay, Tarih ve Kültür Kartları'}
      </h1>
      <HomeClient initialFacts={initialFacts} initialVocabulary={initialVocabulary} initialLang={lang} />
      <nav aria-label="Site Directory" className="sr-only">
        <h2>Scrolly Platform &amp; Editorial Index</h2>
        <ul>
          {TRUST_LINKS.map((item) => (
            <li key={item.href}>
              <Link href={isEn ? `${item.href}?lang=en` : item.href}>
                {isEn ? item.en : `${item.tr} / ${item.en}`}
              </Link>
            </li>
          ))}
        </ul>
        <h3>{isEn ? 'Topic hubs' : 'Konu Kategorileri / Topic Hubs'}</h3>
        <ul>
          {CATEGORY_ROUTE_SLUGS.map((catSlug) => {
            const catId = categoryRouteSlugToId(catSlug)!;
            const meta = getCategoryMeta(catId);
            return (
              <li key={catSlug}>
                <Link href={buildCategoryHref(catSlug, lang)}>
                  {isEn ? meta.label.en : `${meta.label.tr} / ${meta.label.en}`}
                </Link>
              </li>
            );
          })}
        </ul>
        <h3>{isEn ? 'Featured verified facts' : 'Öne Çıkan Doğrulanmış Kartlar / Featured Verified Facts'}</h3>
        <ul>
          {allFacts.slice(0, 18).map((fact) => {
            const slug = getFactPrimarySlug(fact);
            return (
              <li key={fact.id}>
                <Link href={buildFactHref(slug, lang)}>
                  {isEn ? fact.en.title : `${fact.tr.title} — ${fact.en.title}`}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
