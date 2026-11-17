import type { Language } from '@/i18n/translations';
import duplicateSlugToKeeper from '@/lib/duplicateSlugs.json';
import type { CategoryId, FactCard, FactQuizContent, GuessChallenge, LocalizedContent } from '@/types/fact';

const RETIRED_DUPLICATE_SLUGS = new Set(Object.keys(duplicateSlugToKeeper));

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
  'statistics',
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
  'statistics',
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
    case 'statistics':
    case 'istatistik':
      return 'statistics';
    default:
      return null;
  }
}

export function categoryIdToRouteSlug(category: CategoryId | string): CategoryRouteSlug {
  if (category === 'human_body' || category === 'human-body') return 'human-body';
  if (
    category === 'space' ||
    category === 'nature' ||
    category === 'science' ||
    category === 'history' ||
    category === 'records' ||
    category === 'statistics'
  ) {
    return category;
  }
  return 'science';
}

export function getFactPrimarySlug(fact: FactCard): string {
  return fact.slug || fact.en.slug || fact.tr.slug || fact.id;
}

export function isRetiredDuplicateSlug(slug: string): boolean {
  return RETIRED_DUPLICATE_SLUGS.has(slug);
}

export function isRetiredDuplicateFact(fact: FactCard): boolean {
  return isRetiredDuplicateSlug(getFactPrimarySlug(fact));
}

export function factHasLocale(fact: FactCard, lang: 'tr' | 'en'): boolean {
  const content = fact[lang];
  return Boolean(
    content &&
      content.title.trim() &&
      content.factText.trim() &&
      content.slug.trim() &&
      content.quiz?.question &&
      content.quiz.options?.length === 3
  );
}

export function factHreflangLanguages(
  fact: FactCard,
  primarySlug: string
): Record<string, string> | undefined {
  if (!factHasLocale(fact, 'tr') || !factHasLocale(fact, 'en')) return undefined;
  const trUrl = `https://scrolly.live${buildFactHref(primarySlug, 'tr')}`;
  const enUrl = `https://scrolly.live${buildFactHref(primarySlug, 'en')}`;
  return {
    tr: trUrl,
    en: enUrl,
    'x-default': trUrl,
  };
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

const SPOILER_MASK = '[ ??? ]';
const WORD_CHAR_CLASS = '0-9A-Za-z\\u00C0-\\u024F\\u1E00-\\u1EFF_';
const BOUNDARY_LEFT = `(^|[^${WORD_CHAR_CLASS}.,/:-])`;
const BOUNDARY_RIGHT = `(?![${WORD_CHAR_CLASS}]|(?:[.,/:-]\\d))`;

const UNIT_ALIAS_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ['%', 'yüzde', 'percent', 'percentage', 'pct'],
  ['km', 'kilometre', 'kilometer', 'kilometers'],
  ['k', 'kelvin'],
  ['°c', 'c', 'santigrat', 'celsius', 'derece'],
  ['gün', 'day', 'days'],
  ['yıl', 'sene', 'year', 'years'],
  ['saat', 'hour', 'hours', 'hr', 'hrs'],
  ['dk', 'dakika', 'min', 'minute', 'minutes'],
  ['sn', 'saniye', 'sec', 'second', 'seconds'],
  ['m', 'metre', 'meter', 'meters'],
  ['cm', 'santimetre', 'centimeter', 'centimeters'],
  ['mm', 'milimetre', 'millimeter', 'millimeters'],
  ['kat', 'kez', 'defa', 'kere', 'time', 'times', 'x'],
  ['kişi', 'person', 'people', 'persons'],
  ['damla', 'drop', 'drops'],
  ['kalp', 'kalbi', 'heart', 'hearts'],
  ['pilot', 'pilots'],
  ['kg', 'kilogram', 'kilograms'],
  ['g', 'gram', 'grams'],
  ['ton', 'tons', 'tonne', 'tonnes'],
  ['milyon', 'million'],
  ['milyar', 'billion'],
];

const TRIVIAL_BINARY_OPTIONS = new Set([
  'evet',
  'hayır',
  'hayir',
  'doğru',
  'dogru',
  'yanlış',
  'yanlis',
  'yes',
  'no',
  'true',
  'false',
]);

function escapeRegexLiteral(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNumericTokenPattern(value: number, allowRoundedDecimal: boolean): string {
  const abs = Math.abs(value);
  const signPrefix = value < 0 ? '-\\s*' : '';

  if (Number.isInteger(value)) {
    const variants = new Set<string>([String(abs)]);
    if (abs >= 1000) {
      const en = abs.toLocaleString('en-US');
      const tr = en.replace(/,/g, '.');
      variants.add(en);
      variants.add(tr);
    }
    const core = Array.from(variants).map(escapeRegexLiteral).join('|');
    const decimalSuffix = allowRoundedDecimal ? '(?:[.,]\\d{1,2}(?!\\d))?' : '';
    return `${signPrefix}(?:${core})${decimalSuffix}`;
  }

  const raw = String(abs);
  const [intPart, decPart] = raw.split('.');
  const intVariants = new Set<string>([intPart]);
  const intNum = Number(intPart);
  if (Number.isFinite(intNum) && intNum >= 1000) {
    const enInt = intNum.toLocaleString('en-US');
    intVariants.add(enInt);
    intVariants.add(enInt.replace(/,/g, '.'));
  }
  const intCore = Array.from(intVariants).map(escapeRegexLiteral).join('|');
  const decCore = decPart ? `[.,]${escapeRegexLiteral(decPart)}` : '';
  return `${signPrefix}(?:${intCore})${decCore}`;
}

function getUnitVariants(unit: string | undefined, lang: Language): string[] {
  const clean = unit?.trim();
  if (!clean) return [];
  const lower = clean.toLowerCase();
  const variants = new Set<string>([clean]);

  for (const group of UNIT_ALIAS_GROUPS) {
    if (group.includes(lower)) {
      for (const alias of group) {
        variants.add(alias);
      }
    }
  }

  // Match longest unit tokens first (`kilometers` before `km`, `times` before `time`)
  const list = Array.from(variants);
  list.sort((a, b) => b.length - a.length || a.localeCompare(b, lang));
  return list;
}

function replaceWithWordBoundaries(
  source: string,
  corePattern: string
): { nextText: string; matched: boolean } {
  let matched = false;
  const regex = new RegExp(`${BOUNDARY_LEFT}(?:${corePattern})${BOUNDARY_RIGHT}`, 'gi');
  const nextText = source.replace(regex, (_full, lead: string) => {
    matched = true;
    return `${lead}${SPOILER_MASK}`;
  });
  return { nextText, matched };
}

/**
 * Masks the concrete answer spoiler inside front-card prose until the user
 * locks in a guess or flips to the detail view, leaving surrounding text crisp
 * and free of mid-word cuts.
 */
export function maskFactAnswerSpoiler(
  factText: string,
  challenge: GuessChallenge | undefined,
  isRevealed: boolean,
  lang: Language
): string {
  if (!factText || isRevealed || !challenge) {
    return factText;
  }

  if (typeof challenge.correctValue === 'number' && Number.isFinite(challenge.correctValue)) {
    const approxWords =
      lang === 'tr'
        ? ['yaklaşık', 'yaklasik', 'neredeyse', 'about', 'around']
        : ['about', 'around', 'roughly', 'nearly', 'yaklaşık', 'yaklasik'];
    const approxPrefix = `(?:(?:~|≈)\\s*|(?:${approxWords.map(escapeRegexLiteral).join('|')})\\s+)`;
    const unitNum = buildNumericTokenPattern(challenge.correctValue, true);
    const exactNum = buildNumericTokenPattern(challenge.correctValue, false);
    const unitVariants = getUnitVariants(challenge.unit, lang);
    const isPercentUnit = challenge.unit?.trim() === '%' || unitVariants.includes('%');

    if (unitVariants.length > 0) {
      const unitPattern = unitVariants.map(escapeRegexLiteral).join('|');
      const unitAttachedVariants = [`${unitNum}\\s*(?:${unitPattern})`];

      if (isPercentUnit) {
        unitAttachedVariants.push(`(?:%|yüzde)\\s*${unitNum}`);
      }
      const unitAttachedCore = unitAttachedVariants.join('|');

      // Tier 1: approximator + unit-attached value (e.g. "~%1", "~1%", "about 6 times")
      const tier1 = replaceWithWordBoundaries(factText, `${approxPrefix}(?:${unitAttachedCore})`);
      if (tier1.matched) {
        return tier1.nextText;
      }

      // Tier 2: explicit unit-attached value (e.g. "%30,1", "95%", "1.000 kilometre")
      const tier2 = replaceWithWordBoundaries(factText, unitAttachedCore);
      if (tier2.matched) {
        return tier2.nextText;
      }
    }

    // For percentages, avoid masking unrelated non-percentage integers like "1 in 10,000"
    if (!isPercentUnit) {
      const tier3Approx = replaceWithWordBoundaries(factText, `${approxPrefix}${exactNum}`);
      if (tier3Approx.matched) {
        return tier3Approx.nextText;
      }

      const bareRatioGuard = '(?!\\s+(?:in|out\\s+of)\\s+\\d)';
      const tier3Bare = replaceWithWordBoundaries(factText, `${exactNum}${bareRatioGuard}`);
      if (tier3Bare.matched) {
        return tier3Bare.nextText;
      }
    }

    return factText;
  }

  if (
    challenge.type === 'binary' &&
    typeof challenge.correctOptionIndex === 'number' &&
    Array.isArray(challenge.options)
  ) {
    const correctOption = challenge.options[challenge.correctOptionIndex]?.trim() ?? '';
    const lowerOpt = correctOption.toLowerCase();
    const wordCount = correctOption.split(/\s+/).filter(Boolean).length;
    const isTrivialBoolean =
      TRIVIAL_BINARY_OPTIONS.has(lowerOpt) ||
      /^(evet|hayır|hayir|yes|no|true|false|doğru|yanlış)[,;:.!\s]/i.test(lowerOpt);

    if (
      correctOption.length >= 2 &&
      correctOption.length <= 36 &&
      wordCount <= 4 &&
      !isTrivialBoolean
    ) {
      const escapedOption = escapeRegexLiteral(correctOption).replace(/\s+/g, '\\s+');
      const binaryRes = replaceWithWordBoundaries(factText, escapedOption);
      if (binaryRes.matched) {
        return binaryRes.nextText;
      }
    }
  }

  return factText;
}
