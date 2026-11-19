import type { Language } from '@/i18n/translations';
import type { FactCard } from '@/types/fact';
import { pickSeededFacts } from '@/utils/seededRandom';
import { dailyPuzzleNumber, istanbulTodayIso, PUBLIC_SITE_ORIGIN } from '@/utils/viralShare';

export function getDailyGuessDateIso(now = new Date()): string {
  return istanbulTodayIso(now);
}

export function getDailyGuessNumber(isoDate: string): number {
  return Math.max(1, dailyPuzzleNumber(isoDate));
}

export function pickDailyGuessFact(facts: FactCard[], isoDate: string): FactCard | null {
  if (!Array.isArray(facts) || facts.length === 0) return null;
  const sliderFacts = facts.filter(
    (fact) =>
      fact.tr?.guessChallenge?.type === 'slider' &&
      fact.en?.guessChallenge?.type === 'slider' &&
      typeof fact.tr.guessChallenge.correctValue === 'number'
  );
  const candidates =
    sliderFacts.length > 0
      ? sliderFacts
      : facts.filter((fact) => Boolean(fact.tr?.guessChallenge && fact.en?.guessChallenge));
  if (candidates.length === 0) return null;
  return pickSeededFacts(candidates, 1, `daily-guess-${isoDate}`)[0] ?? null;
}

export function computeDailyGuessPercentile(
  accuracyPct: number,
  allAccuracies: number[]
): number {
  const safeAccuracy = Math.max(0, Math.min(100, Math.round(accuracyPct)));
  if (allAccuracies.length >= 3) {
    const strictlyBetter = allAccuracies.filter((val) => val > safeAccuracy).length;
    const rawPct = Math.round(((strictlyBetter + 1) / allAccuracies.length) * 100);
    return Math.max(1, Math.min(99, rawPct));
  }
  return Math.max(1, Math.min(95, Math.round(100 - safeAccuracy * 0.92)));
}

export function buildDailyGuessShareText(params: {
  lang: Language;
  number: number;
  accuracyPct: number;
  topPct: number;
}): string {
  const num = Math.max(1, Math.floor(params.number));
  const acc = Math.max(0, Math.min(100, Math.round(params.accuracyPct)));
  const top = Math.max(1, Math.min(99, Math.round(params.topPct)));

  if (params.lang === 'en') {
    return `Scrolly Daily Guess #${num} 🎯 ${acc}% Accuracy · Top ${top}% | ${PUBLIC_SITE_ORIGIN}/en`;
  }
  return `Scrolly Günün Tahmini #${num} 🎯 %${acc} İsabet · Top %${top} | ${PUBLIC_SITE_ORIGIN}/`;
}
