import type { MetadataRoute } from 'next';
import { getAllFactsWithTimestampsServer } from '@/lib/db';
import { CATEGORY_ROUTE_SLUGS, getFactPrimarySlug } from '@/utils/factsData';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries = await getAllFactsWithTimestampsServer();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: 'https://scrolly.live',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://scrolly.live/about',
      lastModified: new Date('2026-11-01T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: 'https://scrolly.live/privacy',
      lastModified: new Date('2026-11-01T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: 'https://scrolly.live/terms',
      lastModified: new Date('2026-11-01T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: 'https://scrolly.live/contact',
      lastModified: new Date('2026-11-01T00:00:00.000Z'),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_ROUTE_SLUGS.flatMap((slug) => {
    const trUrl = `https://scrolly.live/category/${slug}`;
    const enUrl = `https://scrolly.live/en/category/${slug}`;
    const alternates = {
      languages: {
        tr: trUrl,
        en: enUrl,
      },
    };
    return [
      {
        url: trUrl,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
        alternates,
      },
      {
        url: enUrl,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.8,
        alternates,
      },
    ];
  });

  const seenFactUrls = new Set<string>();
  const factRoutes: MetadataRoute.Sitemap = [];

  for (const { fact, updatedAt } of entries) {
    const primarySlug = getFactPrimarySlug(fact);
    const trUrl = `https://scrolly.live/fact/${primarySlug}`;
    const enUrl = `https://scrolly.live/en/fact/${primarySlug}`;
    if (seenFactUrls.has(trUrl)) continue;
    seenFactUrls.add(trUrl);

    const alternates = {
      languages: {
        tr: trUrl,
        en: enUrl,
      },
    };

    factRoutes.push(
      {
        url: trUrl,
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      },
      {
        url: enUrl,
        lastModified: updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
        alternates,
      }
    );
  }

  return [...staticRoutes, ...categoryRoutes, ...factRoutes];
}
