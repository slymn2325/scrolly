import duplicateSlugToKeeper from '@/lib/duplicateSlugs.json';
import type { FactCard } from '@/types/fact';
import { getFactPrimarySlug } from '@/utils/factsData';
import { looksLikeIpaPhonetic } from '@/utils/phoneticDisplay';

const keeperByRetiredSlug: Record<string, string> = duplicateSlugToKeeper;

/**
 * Sources of the 301s in next.config.mjs (`LEGACY_SLUGS_BY_TARGET` and the
 * duplicate map). Listing any of these would publish a redirect, not a canonical page.
 */
export const REDIRECT_SOURCE_SLUGS = new Set<string>([
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

/** Resolve the canonical, indexable fact slug or `null` for retired/redirect/IPA slugs. */
export function indexableFactSlug(fact: FactCard): string | null {
  let slug = getFactPrimarySlug(fact);
  const seen = new Set<string>();
  while (keeperByRetiredSlug[slug] && !seen.has(slug)) {
    seen.add(slug);
    slug = keeperByRetiredSlug[slug] ?? slug;
  }
  if (
    !slug ||
    slug.includes('/') ||
    looksLikeIpaPhonetic(slug) ||
    REDIRECT_SOURCE_SLUGS.has(slug)
  ) {
    return null;
  }
  return slug;
}
