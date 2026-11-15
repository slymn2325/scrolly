import generatedFactsRaw from '@/data/factsGenerated.json';
import spaceFacts from '@/public/data/facts/space.json';
import natureFacts from '@/public/data/facts/nature.json';
import humanBodyFacts from '@/public/data/facts/human_body.json';
import historyFacts from '@/public/data/facts/history.json';
import scienceFacts from '@/public/data/facts/science.json';
import recordsFacts from '@/public/data/facts/records.json';
import statisticsFacts from '@/public/data/facts/statistics.json';
import type { CategoryId, FactCard } from '@/types/fact';
import {
  enrichFactWithGuessChallenge,
  getFactPrimarySlug,
  interleaveFactsByCategory,
} from '@/utils/factsData';

function normalizeFactCategory(rawCategory: unknown): CategoryId {
  const clean = typeof rawCategory === 'string' ? rawCategory.trim().toLowerCase() : '';
  if (clean === 'weird_records') return 'records';
  if (clean === 'istatistik') return 'statistics';
  if (
    clean === 'space' ||
    clean === 'nature' ||
    clean === 'human_body' ||
    clean === 'history' ||
    clean === 'science' ||
    clean === 'records' ||
    clean === 'statistics'
  ) {
    return clean;
  }
  return 'science';
}

const BASE_SHARDED: Record<CategoryId, FactCard[]> = {
  space: (spaceFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  nature: (natureFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  human_body: (humanBodyFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  history: (historyFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  science: (scienceFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  records: (recordsFacts as FactCard[]).map(enrichFactWithGuessChallenge),
  statistics: (statisticsFacts as FactCard[]).map(enrichFactWithGuessChallenge),
};

const SHARDED_BY_CATEGORY: Record<CategoryId, FactCard[]> = {
  space: [...BASE_SHARDED.space],
  nature: [...BASE_SHARDED.nature],
  human_body: [...BASE_SHARDED.human_body],
  history: [...BASE_SHARDED.history],
  science: [...BASE_SHARDED.science],
  records: [...BASE_SHARDED.records],
  statistics: [...BASE_SHARDED.statistics],
};

const seenFactKeys = new Set<string>();
const collectKeys = (fact: FactCard): string[] =>
  [
    fact.id,
    getFactPrimarySlug(fact),
    fact.slug,
    fact.tr?.slug,
    fact.en?.slug,
  ].filter((k): k is string => typeof k === 'string' && k.trim().length > 0);

(Object.values(SHARDED_BY_CATEGORY) as FactCard[][]).forEach((bucket) => {
  bucket.forEach((fact) => {
    collectKeys(fact).forEach((k) => seenFactKeys.add(k));
  });
});

if (Array.isArray(generatedFactsRaw)) {
  (generatedFactsRaw as unknown as FactCard[]).forEach((raw) => {
    if (!raw || typeof raw !== 'object' || !raw.id || !raw.tr?.factText || !raw.en?.factText) {
      return;
    }
    const category = normalizeFactCategory(raw.category);
    const enriched = enrichFactWithGuessChallenge({
      ...raw,
      category,
      slug: getFactPrimarySlug(raw),
      sketchType: raw.sketchType || raw.id,
    });
    const keys = collectKeys(enriched);
    if (keys.some((k) => seenFactKeys.has(k))) {
      return;
    }
    keys.forEach((k) => seenFactKeys.add(k));
    SHARDED_BY_CATEGORY[category].push(enriched);
  });
}

export const LEGACY_SLUG_TO_FACT_ID: Record<string, string> = {
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
  ...SHARDED_BY_CATEGORY.statistics,
]);

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

export function getRelatedFacts(fact: FactCard, limit = 3): FactCard[] {
  const targetSlug = fact.slug || fact.en.slug || fact.tr.slug || fact.id;
  const isNotCurrent = (item: FactCard) =>
    item.id !== fact.id && (item.slug || item.en.slug || item.tr.slug || item.id) !== targetSlug;

  const sameCategory = ALL_FACTS.filter((item) => isNotCurrent(item) && item.category === fact.category);
  const others = ALL_FACTS.filter((item) => isNotCurrent(item) && item.category !== fact.category);
  return [...sameCategory, ...others].slice(0, limit);
}
