import spaceFacts from '@/public/data/facts/space.json';
import natureFacts from '@/public/data/facts/nature.json';
import humanBodyFacts from '@/public/data/facts/human_body.json';
import historyFacts from '@/public/data/facts/history.json';
import scienceFacts from '@/public/data/facts/science.json';
import recordsFacts from '@/public/data/facts/records.json';
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

const SHARDED_BY_CATEGORY: Record<CategoryId, FactCard[]> = {
  space: (spaceFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  nature: (natureFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  human_body: (humanBodyFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  history: (historyFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  science: (scienceFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  records: (recordsFacts as FactCard[]).map(enrichFactWithGuessChallenge),
};

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

const LEGACY_SLUG_TO_FACT_ID: Record<string, string> = {
  'bir-cay-kasigi-notron-yildizi-6-milyar-ton-agirligindadir': 'space-02',
  'notron-yildizindan-bir-cay-kasigi-madde': 'space-02',
  'a-teaspoon-of-neutron-star-weighs-6-billion-tons': 'space-02',
  'teaspoon-of-neutron-star-weight': 'space-02',
  'uranus-ve-neptunde-gercekten-elmas-yagmuru-yagar': 'space-03',
  'neptun-ve-uranuste-elmas-yagmuru': 'space-03',
  'it-literally-rains-diamonds-on-neptune-and-uranus': 'space-03',
  'diamond-rain-on-neptune-and-uranus': 'space-03',
  'ahtapotlarin-3-kalbi-ve-mavi-kani-vardir': 'nature-01',
  'ahtapotlarin-uc-kalbi-ve-mavi-kani': 'nature-01',
  'octopuses-have-3-hearts-and-blue-blood': 'nature-01',
  'octopuses-have-three-hearts-and-blue-blood': 'nature-01',
  'kopekbaliklari-agaclardan-ve-saturnun-halkalarindan-daha-yaslidir': 'nature-03',
  'kopekbaliklari-agaclardan-ve-saturnun-halkalarindan-eskidir': 'nature-03',
  'sharks-are-older-than-trees-and-saturns-rings': 'nature-03',
  'flamingolar-pembe-degil-gri-beyaz-tuylerle-dogar': 'nature-05',
  'flamingolar-pembe-dogmaz': 'nature-05',
  'flamingos-are-born-grey-not-pink': 'nature-05',
  'antik-misir-mezarlarindaki-3-000-yillik-bal-hala-yenebilir-durumdadir': 'science-02',
  'dogal-bal-binlerce-yil-bozulmaz': 'science-02',
  '3-000-year-old-honey-from-egyptian-tombs-is-still-edible': 'science-02',
  'natural-honey-never-spoils': 'science-02',
  'cilek-botanik-olarak-meyve-degildir-ama-muz-bir-uzumsu-meyvedir': 'science-04',
  'muzlar-dogal-olarak-cok-az-radyoaktiftir': 'science-04',
  'strawberries-arent-berries-but-bananas-are': 'science-04',
  'bananas-are-naturally-slightly-radioactive': 'science-04',
  'eyfel-kulesi-yaz-aylarinda-15-santimetre-uzar': 'weird-02',
  'eyfel-kulesi-yazin-15-santimetre-uzar': 'weird-02',
  'the-eiffel-tower-grows-15-centimeters-taller-in-summer': 'weird-02',
  'eiffel-tower-grows-15-cm-taller-in-summer': 'weird-02',
};

const ALL_FACTS: FactCard[] = interleaveFactsByCategory([
  ...SHARDED_BY_CATEGORY.space,
  ...SHARDED_BY_CATEGORY.nature,
  ...SHARDED_BY_CATEGORY.history,
  ...SHARDED_BY_CATEGORY.human_body,
  ...SHARDED_BY_CATEGORY.science,
  ...SHARDED_BY_CATEGORY.records,
]);

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

export function getAllFacts(): FactCard[] {
  return ALL_FACTS;
}

export function getFactsByCategory(category: CategoryId | 'all'): FactCard[] {
  if (category === 'all') return ALL_FACTS;
  return SHARDED_BY_CATEGORY[category] ?? ALL_FACTS;
}

export function getFactById(id: string): FactCard | undefined {
  return ALL_FACTS.find((f) => f.id === id);
}

export function getFactBySlug(slug: string): FactCard | undefined {
  const direct = ALL_FACTS.find(
    (f) => f.slug === slug || f.tr.slug === slug || f.en.slug === slug || f.id === slug
  );
  if (direct) return direct;
  const legacyId = LEGACY_SLUG_TO_FACT_ID[slug];
  return legacyId ? ALL_FACTS.find((f) => f.id === legacyId) : undefined;
}

export function getFactUrl(fact: FactCard, lang?: Language): string {
  const slug = getFactPrimarySlug(fact);
  if (!lang) return `/fact/${slug}`;
  return `/fact/${slug}?lang=${lang}`;
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

export function getRelatedFacts(fact: FactCard, limit = 3): FactCard[] {
  return getRelatedFactsFromPool(fact, ALL_FACTS, limit, false);
}
