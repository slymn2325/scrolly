import React from 'react';
import Link from 'next/link';
import HomeClient from '@/components/HomeClient';
import { getCategoryMeta } from '@/i18n/translations';
import { fetchVocabularyWithSourceServer, getAllFactsServer } from '@/lib/db';
import { safeJsonLdStringify } from '@/lib/originPolicy';
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
  const homeWebSiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': isEn ? 'https://scrolly.live/en#website' : 'https://scrolly.live/#website',
    name: 'Scrolly',
    alternateName: 'scrolly.live',
    url: isEn ? 'https://scrolly.live/en' : 'https://scrolly.live/',
    inLanguage: isEn ? 'en' : 'tr',
    headline: isEn
      ? 'Scrolly — Scroll, Learn, Wonder | Micro-Learning & Quiz'
      : 'Scrolly — Kaydır, Öğren, Şaşır | Mikro Öğrenme & Quiz',
    description: isEn
      ? 'Explore verified space, nature, human body, history, science, and B1–C2 Word Lab cards. Play Quick Guess sliders, 5-card memory quizzes, and Scrolla 1v1 duels.'
      : 'Uzay, doğa, insan vücudu, tarih, bilim ve B1–C2 İngilizce kelime kartlarını kaydırarak keşfet; Hızlı Tahmin, 5 soruluk Quiz ve Scrolla 1v1 düellosunda yarış!',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(homeWebSiteJsonLd),
        }}
      />
      <section aria-label="Scrolly Overview" className="sr-only">
        <h1>
          {isEn
            ? 'Scrolly — Scroll, Learn, Wonder | Micro-Learning & Quiz'
            : 'Scrolly — Kaydır, Öğren, Şaşır | Mikro Öğrenme & Quiz'}
        </h1>
        <p>
          {isEn
            ? 'Scrolly (https://scrolly.live) is a free bilingual (English and Turkish) reels-style micro-learning platform where you scroll through primary-source verified science, space, nature, human body, history, weird records, statistics, and B1–C2 Word Lab vocabulary cards, test your intuition with Quick Guess sliders, play 5-card memory quizzes, climb the live XP leaderboard, and challenge friends in Scrolla 1v1 live trivia duels.'
            : 'Scrolly (https://scrolly.live); uzay, doğa, insan vücudu, tarih, bilim, garip rekorlar, istatistik ve B1–C2 İngilizce kelime (Word Lab) alanlarında birincil bilimsel kaynaklarla doğrulanmış dikey bilgi kartlarını kaydırarak keşfettiğiniz, Hızlı Tahmin kaydırıcıları ve 5 soruluk Hafıza Quizleri çözdüğünüz, canlı XP sıralamasında yarıştığınız ve Scrolla 1v1 düello odaları kurduğunuz ücretsiz iki dilli mikro-öğrenme platformudur.'}
        </p>
      </section>
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
