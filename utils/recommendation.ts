import type { CategoryFilter, CategoryId } from '@/i18n/translations';
import { cryptoRandomFloat } from '@/utils/cryptoRandom';
import type { FactCardData, FactQuizItem } from '@/utils/factsData';

export interface QuizQuestionItem {
  fact: FactCardData;
}

export interface PreparedQuizOptions {
  options: string[];
  correctIndex: number;
}

/**
 * Deterministically permutes quiz options based on a seed string (such as fact.id)
 * so correct answers are evenly distributed across positions 0, 1, 2 without
 * causing React SSR/client hydration mismatches.
 */
export function prepareQuizOptions(quiz: FactQuizItem, seed: string): PreparedQuizOptions {
  const indexed = quiz.options.map((text, idx) => ({
    text,
    isCorrect: idx === quiz.correctIndex,
  }));

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  // Fisher-Yates using deterministic LCG from seed hash
  const copy = [...indexed];
  let state = hash || 1;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }

  return {
    options: copy.map((o) => o.text),
    correctIndex: copy.findIndex((o) => o.isCorrect),
  };
}

/**
 * Picks the next fact card from the dataset:
 * - Respects active category filter ('all' or specific CategoryId)
 * - Avoids cards already in seenIds (falling back gracefully if pool exhausted)
 * - In 'all' mode, gives the user's top interacted categories +40% selection priority
 */
export function selectNextFactCard(
  allFacts: FactCardData[],
  activeCategory: CategoryFilter,
  seenIds: string[],
  categoryWeights: Record<CategoryId, number>,
  excludeId?: string
): FactCardData {
  const categoryPool =
    activeCategory === 'all'
      ? allFacts
      : allFacts.filter((fact) => fact.category === activeCategory);

  const unseenInPool = categoryPool.filter(
    (fact) => !seenIds.includes(fact.id) && fact.id !== excludeId
  );

  // If all cards in active category were read, fallback to other cards in pool
  const candidates =
    unseenInPool.length > 0
      ? unseenInPool
      : categoryPool.filter((fact) => fact.id !== excludeId);

  if (candidates.length === 0) {
    return allFacts[0];
  }

  // Determine top interacted categories to apply +40% priority boost
  const sortedCategories = (Object.keys(categoryWeights) as CategoryId[])
    .filter((cat) => categoryWeights[cat] > 0)
    .sort((a, b) => categoryWeights[b] - categoryWeights[a]);

  const topCategories = new Set(sortedCategories.slice(0, 2));

  const weighted = candidates.map((fact) => {
    let weight = 1.0;
    if (activeCategory === 'all' && topCategories.has(fact.category)) {
      // Explicit +40% priority boost plus slight affinity scaling
      const affinityBonus = Math.min(0.3, (categoryWeights[fact.category] ?? 0) * 0.03);
      weight = 1.4 + affinityBonus;
    }
    return { fact, weight };
  });

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = cryptoRandomFloat() * totalWeight;

  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.fact;
    }
  }

  return weighted[weighted.length - 1].fact;
}

/**
 * Generates a 3-question Memory Quiz built strictly from the user's
 * last 5 read fact cards (recentFiveIds). If fewer than 3 cards were read
 * (e.g. user clicks "Mini Quiz" immediately), pads from the active card / unread fallback.
 */
export function generateMemoryQuizFromRecent(
  recentFiveIds: string[],
  allFacts: FactCardData[],
  currentCard?: FactCardData
): QuizQuestionItem[] {
  const recentFacts = recentFiveIds
    .map((id) => allFacts.find((f) => f.id === id))
    .filter((f): f is FactCardData => Boolean(f));

  const pool: FactCardData[] = [...recentFacts];

  if (currentCard && !pool.some((f) => f.id === currentCard.id)) {
    pool.push(currentCard);
  }

  // Only pad if user clicked "Mini Quiz" before reading 3 cards
  if (pool.length < 3) {
    for (const candidate of allFacts) {
      if (!pool.some((f) => f.id === candidate.id)) {
        pool.push(candidate);
      }
      if (pool.length >= 3) break;
    }
  }

  // Shuffle the last up to 5 read cards and select 3 questions
  const shuffled = [...pool].sort(() => cryptoRandomFloat() - 0.5);
  return shuffled.slice(0, 3).map((fact) => ({ fact }));
}
