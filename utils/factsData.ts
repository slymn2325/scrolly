import type { Language } from '@/i18n/translations';
import type { CategoryId, FactCard, FactQuizContent, GuessChallenge, LocalizedContent } from '@/types/fact';

export type { FactCard, FactQuizContent, GuessChallenge, LocalizedContent };
export type FactCardData = FactCard;
export type FactQuizItem = FactQuizContent;

function buildFallbackGuessChallenge(
  factId: string,
  localized: LocalizedContent
): GuessChallenge {
  if (localized.guessChallenge) {
    return localized.guessChallenge;
  }

  const { quiz } = localized;
  const correctOpt = quiz.options[quiz.correctIndex] ?? quiz.options[0];
  const distractorIdx = quiz.correctIndex === 0 ? 1 : 0;
  const distractorOpt = quiz.options[distractorIdx] ?? quiz.options[1];

  let hash = 0;
  for (let i = 0; i < factId.length; i += 1) {
    hash += factId.charCodeAt(i);
  }
  const putCorrectFirst = hash % 2 === 0;

  return {
    type: 'binary',
    prompt: quiz.question,
    options: putCorrectFirst ? [correctOpt, distractorOpt] : [distractorOpt, correctOpt],
    correctOptionIndex: putCorrectFirst ? 0 : 1,
  };
}

export function enrichFactWithGuessChallenge(fact: FactCard): FactCard {
  return {
    ...fact,
    tr: {
      ...fact.tr,
      guessChallenge: buildFallbackGuessChallenge(`${fact.id}-tr`, fact.tr),
    },
    en: {
      ...fact.en,
      guessChallenge: buildFallbackGuessChallenge(`${fact.id}-en`, fact.en),
    },
  };
}

export const ROUND_ROBIN_CATEGORY_ORDER: CategoryId[] = [
  'space',
  'nature',
  'history',
  'human_body',
  'science',
  'records',
];

/**
 * Interleaves facts in strict Round-Robin order across categories
 * (`space` -> `nature` -> `history` -> `human_body` -> `science` -> `records`)
 * so consecutive cards never repeat the same category back-to-back while multiple
 * categories have remaining items.
 */
export function interleaveFactsByCategory(facts: FactCard[]): FactCard[] {
  const buckets = new Map<CategoryId, FactCard[]>();
  for (const cat of ROUND_ROBIN_CATEGORY_ORDER) {
    buckets.set(cat, []);
  }
  const extra: FactCard[] = [];

  for (const fact of facts) {
    const bucket = buckets.get(fact.category);
    if (bucket) {
      bucket.push(fact);
    } else {
      extra.push(fact);
    }
  }

  const result: FactCard[] = [];
  let maxLen = 0;
  for (const list of buckets.values()) {
    if (list.length > maxLen) maxLen = list.length;
  }

  for (let i = 0; i < maxLen; i += 1) {
    for (const cat of ROUND_ROBIN_CATEGORY_ORDER) {
      const list = buckets.get(cat);
      if (list && i < list.length) {
        result.push(list[i]);
      }
    }
  }

  if (extra.length > 0) {
    result.push(...extra);
  }
  return result;
}

export const CATEGORY_ROUTE_SLUGS = [
  'space',
  'nature',
  'science',
  'history',
  'human-body',
  'records',
] as const;

export type CategoryRouteSlug = (typeof CATEGORY_ROUTE_SLUGS)[number];

export function categoryRouteSlugToId(routeSlug: string): CategoryId | null {
  const normalized = routeSlug.trim().toLowerCase();
  switch (normalized) {
    case 'space':
      return 'space';
    case 'nature':
      return 'nature';
    case 'science':
      return 'science';
    case 'history':
      return 'history';
    case 'human-body':
    case 'human_body':
      return 'human_body';
    case 'records':
    case 'weird_records':
      return 'records';
    default:
      return null;
  }
}

export function categoryIdToRouteSlug(category: CategoryId | string): CategoryRouteSlug {
  if (category === 'human_body' || category === 'human-body') return 'human-body';
  if (category === 'space' || category === 'nature' || category === 'science' || category === 'history' || category === 'records') {
    return category;
  }
  return 'science';
}

export function getFactPrimarySlug(fact: FactCard): string {
  return fact.slug || fact.en.slug || fact.tr.slug || fact.id;
}

export function buildFactHref(slug: string, lang?: string): string {
  const safeLang: 'tr' | 'en' = lang === 'en' ? 'en' : 'tr';
  const cleanSlug = encodeURIComponent(String(slug || '').trim());
  return safeLang === 'en' ? `/en/fact/${cleanSlug}` : `/fact/${cleanSlug}`;
}

export function buildCategoryHref(slug: string, lang?: string): string {
  const safeLang: 'tr' | 'en' = lang === 'en' ? 'en' : 'tr';
  const cleanSlug = encodeURIComponent(String(slug || '').trim());
  return safeLang === 'en' ? `/en/category/${cleanSlug}` : `/category/${cleanSlug}`;
}

export function getFactUrl(fact: FactCard, lang?: Language): string {
  return buildFactHref(getFactPrimarySlug(fact), lang);
}

export function getRelatedFactsFromPool(
  fact: FactCard,
  pool: FactCard[],
  limit = 4,
  sameCategoryOnly = false
): FactCard[] {
  const targetSlug = getFactPrimarySlug(fact);
  const isNotCurrent = (item: FactCard) =>
    item.id !== fact.id && getFactPrimarySlug(item) !== targetSlug;

  const sameCategory = pool.filter(
    (item) => isNotCurrent(item) && item.category === fact.category
  );
  if (sameCategoryOnly) {
    return sameCategory.slice(0, limit);
  }
  const others = pool.filter(
    (item) => isNotCurrent(item) && item.category !== fact.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}
