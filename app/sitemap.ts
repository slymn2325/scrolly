import type { MetadataRoute } from 'next';
import duplicateSlugToKeeper from '@/lib/duplicateSlugs.json';
import {
  HOMEPAGE_COPY_UPDATED,
  categoryPageCount,
  categoryPageUrl,
  latestContentDate,
} from '@/lib/categoryPages';
import { getAllFactsWithTimestampsServer } from '@/lib/db';
import {
  CATEGORY_ROUTE_SLUGS,
  categoryRouteSlugToId,
  factHasLocale,
  factHreflangLanguages,
  getFactPrimarySlug,
} from '@/utils/factsData';
import type { FactCard } from '@/types/fact';

export const revalidate = 3600;

const keeperByRetiredSlug: Record<string, string> = duplicateSlugToKeeper;

/**
 * Sources of the 301s in next.config.mjs (`LEGACY_SLUGS_BY_TARGET` and the
 * duplicate map). Listing any of these would publish a redirect, not a page.
 */
const REDIRECT_SOURCE_SLUGS = new Set<string>([
  ...Object.keys(keeperByRetiredSlug),
  'ahtapotlarin-3-kalbi-ve-mavi-kani-vardir',
  'ahtapotlarin-uc-kalbi-ve-mavi-kani',
  'octopuses-have-3-hearts-and-blue-blood',
  'octopuses-have-three-hearts-and-blue-blood',
  'kopekbaliklari-agaclardan-ve-saturnun-halkalarindan-daha-yaslidir',
  'kopekbaliklari-agaclardan-ve-saturnun-halkalarindan-eskidir',
  'sharks-are-older-than-trees-and-saturns-rings',
  'flamingolar-pembe-degil-gri-beyaz-tuylerle-dogar',
  'flamingolar-pembe-dogmaz',
  'flamingos-are-born-grey-not-pink',
  'antik-misir-mezarlarindaki-3-000-yillik-bal-hala-yenebilir-durumdadir',
  'dogal-bal-binlerce-yil-bozulmaz',
  '3-000-year-old-honey-from-egyptian-tombs-is-still-edible',
  'natural-honey-never-spoils',
  'cilek-botanik-olarak-meyve-degildir-ama-muz-bir-uzumsu-meyvedir',
  'muzlar-dogal-olarak-cok-az-radyoaktiftir',
  'strawberries-arent-berries-but-bananas-are',
  'bananas-are-naturally-slightly-radioactive',
  'eyfel-kulesi-yaz-aylarinda-15-santimetre-uzar',
  'eyfel-kulesi-yazin-15-santimetre-uzar',
  'the-eiffel-tower-grows-15-centimeters-taller-in-summer',
  'eiffel-tower-grows-15-cm-taller-in-summer',
]);

function indexableFactSlug(fact: FactCard): string | null {
  let slug = getFactPrimarySlug(fact);
  const seen = new Set<string>();
  while (keeperByRetiredSlug[slug] && !seen.has(slug)) {
    seen.add(slug);
    slug = keeperByRetiredSlug[slug] ?? slug;
  }
  if (!slug || REDIRECT_SOURCE_SLUGS.has(slug)) return null;
  return slug;
}

const STATIC_COPY_UPDATED = new Date('2026-11-01T00:00:00.000Z');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getAllFactsWithTimestampsServer();
  const homeLastModified =
    latestContentDate([
      HOMEPAGE_COPY_UPDATED,
      ...entries.map((entry) => entry.updatedAt),
    ]) ?? HOMEPAGE_COPY_UPDATED;
  const homeLanguages = {
    tr: 'https://scrolly.live',
    en: 'https://scrolly.live/en',
    'x-default': 'https://scrolly.live',
  };

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: 'https://scrolly.live',
      lastModified: homeLastModified,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: { languages: homeLanguages },
    },
    {
      url: 'https://scrolly.live/en',
      lastModified: homeLastModified,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: { languages: homeLanguages },
    },
    {
      url: 'https://scrolly.live/about',
      lastModified: STATIC_COPY_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: 'https://scrolly.live/privacy',
      lastModified: STATIC_COPY_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: 'https://scrolly.live/terms',
      lastModified: STATIC_COPY_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: 'https://scrolly.live/contact',
      lastModified: STATIC_COPY_UPDATED,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_ROUTE_SLUGS.flatMap((slug) => {
    const categoryId = categoryRouteSlugToId(slug);
    const seenSlugs = new Set<string>();
    const categoryEntries = entries.filter((entry) => {
      if (entry.fact.category !== categoryId) return false;
      const factSlug = indexableFactSlug(entry.fact);
      if (!factSlug || seenSlugs.has(factSlug)) return false;
      seenSlugs.add(factSlug);
      return true;
    });
    if (categoryEntries.length === 0) return [];
    const lastModified =
      latestContentDate(categoryEntries.map((entry) => entry.updatedAt)) ??
      new Date('2026-01-01T00:00:00.000Z');
    const pages = categoryPageCount(categoryEntries.length);
    const routes: MetadataRoute.Sitemap = [];
    for (let page = 1; page <= pages; page += 1) {
      const trUrl = categoryPageUrl(slug, 'tr', page);
      const enUrl = categoryPageUrl(slug, 'en', page);
      const alternates = {
        languages: {
          tr: trUrl,
          en: enUrl,
          'x-default': trUrl,
        },
      };
      routes.push(
        {
          url: trUrl,
          lastModified,
          changeFrequency: 'weekly',
          priority: page === 1 ? 0.8 : 0.6,
          alternates,
        },
        {
          url: enUrl,
          lastModified,
          changeFrequency: 'weekly',
          priority: page === 1 ? 0.8 : 0.6,
          alternates,
        }
      );
    }
    return routes;
  });

  const seenFactUrls = new Set<string>();
  const factRoutes: MetadataRoute.Sitemap = [];

  for (const { fact, updatedAt } of entries) {
    const primarySlug = indexableFactSlug(fact);
    if (!primarySlug) continue;
    const trReady = factHasLocale(fact, 'tr');
    const enReady = factHasLocale(fact, 'en');
    const languages = factHreflangLanguages(fact, primarySlug);
    const alternates = languages ? { languages } : undefined;
    const trUrl = `https://scrolly.live/fact/${primarySlug}`;
    const enUrl = `https://scrolly.live/en/fact/${primarySlug}`;

    if (trReady && !seenFactUrls.has(trUrl)) {
      seenFactUrls.add(trUrl);
      factRoutes.push({
        url: trUrl,
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
        ...(alternates ? { alternates } : {}),
      });
    }
    if (enReady && !seenFactUrls.has(enUrl)) {
      seenFactUrls.add(enUrl);
      factRoutes.push({
        url: enUrl,
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
        ...(alternates ? { alternates } : {}),
      });
    }
  }

  return [...staticRoutes, ...categoryRoutes, ...factRoutes];
}
