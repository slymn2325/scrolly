import type { MetadataRoute } from 'next';
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
  isRetiredDuplicateFact,
} from '@/utils/factsData';

export const revalidate = 3600;

const STATIC_COPY_UPDATED = new Date('2026-11-01T00:00:00.000Z');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = (await getAllFactsWithTimestampsServer()).filter(
    (entry) => !isRetiredDuplicateFact(entry.fact)
  );
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
    const categoryEntries = entries.filter((entry) => entry.fact.category === categoryId);
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
    const primarySlug = getFactPrimarySlug(fact);
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
