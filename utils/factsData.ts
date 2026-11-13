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

const ALL_FACTS: FactCard[] = [
  ...SHARDED_BY_CATEGORY.space,
  ...SHARDED_BY_CATEGORY.nature,
  ...SHARDED_BY_CATEGORY.human_body,
  ...SHARDED_BY_CATEGORY.history,
  ...SHARDED_BY_CATEGORY.science,
  ...SHARDED_BY_CATEGORY.records,
];

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
  return ALL_FACTS.find((f) => f.tr.slug === slug || f.en.slug === slug);
}

export function getFactUrl(fact: FactCard, lang: Language): string {
  return lang === 'tr' ? `/bilgi/${fact.tr.slug}` : `/en/fact/${fact.en.slug}`;
}

export function getRelatedFacts(fact: FactCard, limit = 3): FactCard[] {
  const sameCategory = ALL_FACTS.filter(
    (item) => item.id !== fact.id && item.category === fact.category
  );
  const others = ALL_FACTS.filter(
    (item) => item.id !== fact.id && item.category !== fact.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}
