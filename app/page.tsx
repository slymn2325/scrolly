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

// Always render fresh Postgres facts and vocabulary on demand without stale ISR caching.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [allFacts, { vocabulary: initialVocabulary }] = await Promise.all([
    getAllFactsServer(),
    fetchVocabularyWithSourceServer(),
  ]);
  const initialFacts = interleaveFactsByCategory(allFacts).slice(0, 36);

  return (
    <>
      <h1 className="sr-only">
        Scrolly — Doğrulanmış İki Dilli Mikro Bilim, Uzay, Tarih ve Kültür Kartları
      </h1>
      <HomeClient initialFacts={initialFacts} initialVocabulary={initialVocabulary} />
      <nav aria-label="Site Directory" className="sr-only">
        <h2>Scrolly Platform &amp; Editorial Index</h2>
        <ul>
          <li>
            <Link href="/about">Hakkımızda / About Us</Link>
          </li>
          <li>
            <Link href="/privacy">Gizlilik ve Çerez Politikası / Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Kullanım Koşulları / Terms of Use</Link>
          </li>
          <li>
            <Link href="/contact">İletişim / Contact</Link>
          </li>
        </ul>
        <h3>Konu Kategorileri / Topic Hubs</h3>
        <ul>
          {CATEGORY_ROUTE_SLUGS.map((catSlug) => {
            const catId = categoryRouteSlugToId(catSlug)!;
            const meta = getCategoryMeta(catId);
            return (
              <li key={catSlug}>
                <Link href={buildCategoryHref(catSlug, 'tr')}>
                  {meta.label.tr} / {meta.label.en}
                </Link>
              </li>
            );
          })}
        </ul>
        <h3>Öne Çıkan Doğrulanmış Kartlar / Featured Verified Facts</h3>
        <ul>
          {allFacts.slice(0, 18).map((fact) => {
            const slug = getFactPrimarySlug(fact);
            return (
              <li key={fact.id}>
                <Link href={buildFactHref(slug, 'tr')}>
                  {fact.tr.title} — {fact.en.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
