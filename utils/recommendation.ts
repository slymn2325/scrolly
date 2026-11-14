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

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function fisherYatesShuffle<T>(items: T[], seed?: string): T[] {
  const copy = [...items];
  let state = seed ? hashSeed(seed) : 0;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    let j: number;
    if (seed) {
      state = (state * 1664525 + 1013904223) >>> 0;
      j = state % (i + 1);
    } else {
      j = Math.floor(cryptoRandomFloat() * (i + 1));
    }
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function hasPlayableQuiz(fact: FactCardData): boolean {
  const trOk = Boolean(fact.tr?.quiz?.question && fact.tr.quiz.options?.length >= 2);
  const enOk = Boolean(fact.en?.quiz?.question && fact.en.quiz.options?.length >= 2);
  return trOk || enOk;
}

/**
 * Deterministically permutes quiz options based on a seed string (such as fact.id)
 * so correct answers are evenly distributed across positions 0, 1, 2 without
 * causing React SSR/client hydration mismatches.
 */
export function prepareQuizOptions(quiz: FactQuizItem, seed: string): PreparedQuizOptions {
  const seenOption = new Set<string>();
  const indexed = quiz.options
    .map((text, idx) => ({
      text: (text ?? '').trim(),
      isCorrect: idx === quiz.correctIndex,
    }))
    .filter((entry) => {
      if (!entry.text) return false;
      const key = entry.text.toLowerCase();
      if (seenOption.has(key) && !entry.isCorrect) return false;
      seenOption.add(key);
      return true;
    });

  const copy = fisherYatesShuffle(indexed, seed);
  const resolvedCorrectIndex = Math.max(0, copy.findIndex((o) => o.isCorrect));

  return {
    options: copy.map((o) => o.text),
    correctIndex: resolvedCorrectIndex,
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
  const isAllPool = activeCategory === 'all' || activeCategory === 'vocabulary';
  const categoryPool = isAllPool
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
    if (isAllPool && topCategories.has(fact.category)) {
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
 * Generates a 3-question Memory Quiz built from the user's last read fact cards,
 * smartly padding with playable topic-matched questions when fewer than 3 were read.
 */
export function generateMemoryQuizFromRecent(
  recentFiveIds: string[],
  allFacts: FactCardData[],
  currentCard?: FactCardData,
  activeCategory?: CategoryFilter
): QuizQuestionItem[] {
  const recentFacts = recentFiveIds
    .map((id) => allFacts.find((f) => f.id === id))
    .filter((f): f is FactCardData => Boolean(f) && hasPlayableQuiz(f!));

  const pool: FactCardData[] = [];
  const addedIds = new Set<string>();
  const pushUnique = (fact: FactCardData | undefined) => {
    if (!fact || addedIds.has(fact.id) || !hasPlayableQuiz(fact)) return;
    addedIds.add(fact.id);
    pool.push(fact);
  };

  for (const fact of recentFacts) pushUnique(fact);
  pushUnique(currentCard);

  if (pool.length < 3) {
    const preferredCategory: CategoryId | undefined =
      activeCategory && activeCategory !== 'all' && activeCategory !== 'vocabulary'
        ? activeCategory
        : currentCard?.category;

    const playable = fisherYatesShuffle(allFacts.filter(hasPlayableQuiz));
    const sameCategory = preferredCategory
      ? playable.filter((f) => f.category === preferredCategory)
      : [];

    for (const candidate of [...sameCategory, ...playable]) {
      pushUnique(candidate);
      if (pool.length >= 3) break;
    }
  }

  return fisherYatesShuffle(pool).slice(0, 3).map((fact) => ({ fact }));
}

/**
 * Builds an engaging topic-focused (or cross-topic balanced) quiz set of `count`
 * playable cards, prioritizing unseen cards and avoiding consecutive duplicate tags.
 */
export function buildTopicQuizQuestions(
  allFacts: FactCardData[],
  category: CategoryFilter = 'all',
  count = 5,
  seenIds: string[] = [],
  seed?: string
): QuizQuestionItem[] {
  const seenSet = new Set(seenIds);
  const playable = allFacts.filter(hasPlayableQuiz);
  const scoped =
    category === 'all' || category === 'vocabulary'
      ? playable
      : playable.filter((f) => f.category === category);

  const unseen = fisherYatesShuffle(
    scoped.filter((f) => !seenSet.has(f.id)),
    seed ? `${seed}:unseen` : undefined
  );
  const seen = fisherYatesShuffle(
    scoped.filter((f) => seenSet.has(f.id)),
    seed ? `${seed}:seen` : undefined
  );

  const orderedPool = [...unseen, ...seen];
  const fallbackPool = orderedPool.length >= count ? orderedPool : fisherYatesShuffle(playable, seed);

  const chosen: FactCardData[] = [];
  const chosenIds = new Set<string>();
  const usedTags = new Set<string>();

  for (const candidate of fallbackPool) {
    if (chosen.length >= count) break;
    if (chosenIds.has(candidate.id)) continue;
    const tagKey = (candidate.tr?.tag || candidate.en?.tag || '').trim().toLowerCase();
    if (tagKey && usedTags.has(tagKey) && fallbackPool.length > count * 2) continue;
    chosenIds.add(candidate.id);
    if (tagKey) usedTags.add(tagKey);
    chosen.push(candidate);
  }

  if (chosen.length < count) {
    for (const candidate of fallbackPool) {
      if (chosen.length >= count) break;
      if (chosenIds.has(candidate.id)) continue;
      chosenIds.add(candidate.id);
      chosen.push(candidate);
    }
  }

  return chosen.map((fact) => ({ fact }));
}
