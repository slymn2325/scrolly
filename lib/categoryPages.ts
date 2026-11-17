import type { Metadata } from 'next';
import type { Language } from '@/i18n/translations';
import { BRAND_OG_IMAGE } from '@/lib/homeMetadata';
import { fitDocumentTitle } from '@/utils/factSeo';
import { buildCategoryHref } from '@/utils/factsData';

export const CATEGORY_PAGE_SIZE = 12;

export const HOMEPAGE_COPY_UPDATED = new Date('2026-11-17T00:00:00.000Z');

export function parseCategoryPage(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return 1;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export function categoryPageCount(total: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / CATEGORY_PAGE_SIZE);
}

export function categoryPagePath(slug: string, lang: Language, page: number): string {
  const base = buildCategoryHref(slug, lang);
  return page > 1 ? `${base}?page=${page}` : base;
}

export function categoryPageUrl(slug: string, lang: Language, page: number): string {
  return `https://scrolly.live${categoryPagePath(slug, lang, page)}`;
}

/** Document title stays within 60 characters, and category pages share the brand OG image. */
export function withCategoryPageMetadata(metadata: Metadata): Metadata {
  const title =
    typeof metadata.title === 'string' ? fitDocumentTitle(metadata.title) : metadata.title;
  if (!metadata.openGraph) return { ...metadata, title };
  const alt = typeof title === 'string' ? title : BRAND_OG_IMAGE.alt;
  const image = { ...BRAND_OG_IMAGE, alt };
  return {
    ...metadata,
    title,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
    twitter: {
      ...metadata.twitter,
      card: 'summary_large_image',
      images: [image.url],
    },
  };
}

export function latestContentDate(dates: Date[], fallback?: Date): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) continue;
    if (latest === null || date > latest) latest = date;
  }
  if (latest && fallback && fallback > latest) return fallback;
  return latest ?? fallback ?? null;
}
