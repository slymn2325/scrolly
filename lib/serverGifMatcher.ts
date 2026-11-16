import { ensureSchema, getPool, hasDatabaseUrl } from '@/lib/db';
import {
  getFactGifUrlDb,
  getVocabularyGifUrlDb,
  updateFactGifQueryOnlyDb,
  updateFactGifUrlDb,
  updateVocabularyGifQueryOnlyDb,
  updateVocabularyGifUrlDb,
} from '@/lib/dbActions';
import {
  hasConfiguredGifProviderKeys,
  isRenderableGifImageUrl,
  sanitizeVisualQuery,
  searchTopicGif,
} from '@/lib/gifService';
import type { CategoryId, FactCard } from '@/types/fact';

/**
 * Shared safety ceiling strictly under 100 req/hr GIF API tier limits
 * (tracked persistently in Postgres `scheduler_state` with 10-req/hr safety headroom).
 */
export const GIF_HOURLY_QUOTA_LIMIT = 90;
export const GIF_QUOTA_WINDOW_MS = 60 * 60 * 1000;

/** Cap outbound GIF searches per backfill run so a bad key/filter cannot burn 90/90. */
export const GIF_BACKFILL_MAX_ATTEMPTS_PER_RUN = 12;
/** Delay between Giphy/Tenor HTTP calls inside a backfill loop. */
export const GIF_REQUEST_GAP_MS = 350;
/** Stop the loop after this many consecutive errors or empty clean matches. */
export const GIF_CIRCUIT_BREAKER_THRESHOLD = 3;

const BACKFILL_THROTTLE_MS = 60 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ABSTRACT_VISUAL_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by',
  'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'can', 'could', 'would',
  'should', 'may', 'might', 'will', 'than', 'that', 'this', 'these', 'those', 'your',
  'our', 'their', 'its', 'only', 'more', 'most', 'nearly', 'almost', 'over', 'under',
  'about', 'around', 'just', 'into', 'like', 'not', 'every', 'each', 'many', 'much',
  'very', 'even', 'also', 'between', 'through', 'during', 'before', 'after', 'how',
  'why', 'what', 'when', 'where', 'which', 'who', 'fact', 'facts', 'average', 'percent',
  'percentage', 'ratio', 'probability', 'odds', 'chance', 'number', 'numbers', 'data',
  'study', 'research', 'survey', 'statistic', 'statistics', 'record', 'records', 'world',
  'global', 'daily', 'yearly', 'annual', 'million', 'billion', 'trillion', 'thousand',
  'hundred', 'times', 'faster', 'slower', 'bigger', 'smaller', 'larger', 'longer',
  'higher', 'lower', 'second', 'minute', 'hour', 'year', 'years', 'days', 'tr', 'en',
]);

const GENERIC_SINGLE_QUERY_WORDS = new Set([
  'space', 'nature', 'science', 'history', 'body', 'human', 'record', 'records',
  'stat', 'stats', 'statistics', 'fact', 'facts', 'discovery', 'world', 'data',
]);

const CATEGORY_VISUAL_FALLBACKS: Record<string, string> = {
  space: 'cosmos nebula planet',
  nature: 'wildlife ocean forest',
  human_body: 'human brain heartbeat',
  history: 'ancient ruins temple',
  science: 'physics laboratory atom',
  records: 'extreme lightning storm',
  statistics: 'earth city globe',
};

export interface HourlyGifQuotaStatus {
  limit: number;
  windowMs: number;
  used: number;
  remaining: number;
  exhausted: boolean;
  resetsAt: string | null;
}

export interface GifMatchInput {
  slug?: string;
  id?: string;
  category?: CategoryId | string;
  visualQuery?: string | null;
  gifQuery?: string | null;
  gifUrl?: string | null;
  title?: string | null;
  titleEn?: string | null;
  factText?: string | null;
  summaryEn?: string | null;
  en?: {
    slug?: string;
    title?: string;
    factText?: string;
  };
}

export interface MatchFactGifResult {
  slug: string;
  gifUrl: string | null;
  gifQuery: string;
  provider: 'postgres' | 'giphy' | 'tenor' | 'none';
  persisted: boolean;
  cached?: boolean;
  rateLimited?: boolean;
  skippedReason?:
    | 'already_cached'
    | 'no_api_key'
    | 'invalid_query'
    | 'quota_exceeded'
    | 'no_clean_match'
    | 'circuit_open'
    | 'upstream_error';
  emptyResult?: boolean;
  upstreamError?: boolean;
  httpStatus?: number;
}

export interface BackfillGifOptions {
  entries?: Array<GifMatchInput | FactCard | { fact: FactCard }>;
  maxPerRun?: number;
  minRemainingQuota?: number;
  allowMemoryOnly?: boolean;
  force?: boolean;
}

export interface BackfillGifResult {
  attempted: number;
  matched: number;
  persisted: number;
  quotaStatus: HourlyGifQuotaStatus;
  rateLimited?: boolean;
  skippedReason?: string;
}

declare global {
  var __scrollyGifQuotaTimestamps: number[] | undefined;
  var __scrollyGifBackfillLastRunAt: number | undefined;
  var __scrollyGifBackfillInFlight: Promise<BackfillGifResult> | undefined;
}

function getQuotaTimestamps(): number[] {
  if (!globalThis.__scrollyGifQuotaTimestamps) {
    globalThis.__scrollyGifQuotaTimestamps = [];
  }
  return globalThis.__scrollyGifQuotaTimestamps;
}

function pruneQuotaWindow(now = Date.now()): number[] {
  const cutoff = now - GIF_QUOTA_WINDOW_MS;
  const raw = getQuotaTimestamps();
  let writeIdx = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const ts = raw[i];
    if (ts > cutoff && ts <= now + 60_000) {
      raw[writeIdx] = ts;
      writeIdx += 1;
    }
  }
  raw.length = writeIdx;
  return raw;
}

/**
 * Synchronous in-memory sliding-window status (used when `DATABASE_URL` is absent
 * and in unit tests). Authoritative production tracking lives in Postgres `scheduler_state`.
 */
export function getHourlyGifQuotaStatus(now = Date.now()): HourlyGifQuotaStatus {
  const windowHits = pruneQuotaWindow(now);
  const used = Math.min(GIF_HOURLY_QUOTA_LIMIT, windowHits.length);
  const remaining = Math.max(0, GIF_HOURLY_QUOTA_LIMIT - used);
  const oldest = windowHits.length > 0 ? windowHits[0] : null;
  return {
    limit: GIF_HOURLY_QUOTA_LIMIT,
    windowMs: GIF_QUOTA_WINDOW_MS,
    used,
    remaining,
    exhausted: remaining <= 0,
    resetsAt: oldest !== null ? new Date(oldest + GIF_QUOTA_WINDOW_MS).toISOString() : null,
  };
}

export function canConsumeGifQuota(count = 1, now = Date.now()): boolean {
  const safeCount = Math.max(1, Math.floor(count));
  const windowHits = pruneQuotaWindow(now);
  return windowHits.length + safeCount <= GIF_HOURLY_QUOTA_LIMIT;
}

export function consumeGifQuota(count = 1, now = Date.now()): boolean {
  const safeCount = Math.max(1, Math.floor(count));
  const windowHits = pruneQuotaWindow(now);
  if (windowHits.length + safeCount > GIF_HOURLY_QUOTA_LIMIT) {
    return false;
  }
  for (let i = 0; i < safeCount; i += 1) {
    windowHits.push(now);
  }
  return true;
}

/**
 * Reads the authoritative hourly GIF quota from Postgres `scheduler_state` (automatically
 * resetting stale windows older than 1 hour), or falls back to in-memory tracking offline.
 */
export async function getHourlyGifQuotaStatusServer(): Promise<HourlyGifQuotaStatus> {
  if (!hasDatabaseUrl()) {
    return getHourlyGifQuotaStatus();
  }
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{
      gif_hour_window_start: Date | string | null;
      gif_requests_in_window: number;
      window_expired: boolean;
    }>(
      `SELECT
         gif_hour_window_start,
         gif_requests_in_window,
         (gif_hour_window_start IS NULL OR gif_hour_window_start <= NOW() - INTERVAL '1 hour') AS window_expired
       FROM scheduler_state
       WHERE id = 1`
    );
    const row = res.rows[0];
    if (!row || row.window_expired) {
      return {
        limit: GIF_HOURLY_QUOTA_LIMIT,
        windowMs: GIF_QUOTA_WINDOW_MS,
        used: 0,
        remaining: GIF_HOURLY_QUOTA_LIMIT,
        exhausted: false,
        resetsAt: null,
      };
    }

    const used = Math.min(
      GIF_HOURLY_QUOTA_LIMIT,
      Math.max(0, Math.floor(Number(row.gif_requests_in_window ?? 0)))
    );
    const remaining = Math.max(0, GIF_HOURLY_QUOTA_LIMIT - used);
    const windowMs = row.gif_hour_window_start
      ? new Date(row.gif_hour_window_start).getTime()
      : Date.now();
    return {
      limit: GIF_HOURLY_QUOTA_LIMIT,
      windowMs: GIF_QUOTA_WINDOW_MS,
      used,
      remaining,
      exhausted: remaining <= 0,
      resetsAt: Number.isFinite(windowMs)
        ? new Date(windowMs + GIF_QUOTA_WINDOW_MS).toISOString()
        : null,
    };
  } catch (err) {
    console.warn('[serverGifMatcher] Postgres quota read fell back to memory:', err);
    return getHourlyGifQuotaStatus();
  }
}

/**
 * Atomically resets an expired 1-hour window (if needed) and increments
 * `scheduler_state.gif_requests_in_window` BEFORE any outbound GIF API HTTP call.
 * Returns `false` cleanly once the 90/hr cap is reached.
 */
export async function consumeHourlyGifQuotaServer(): Promise<boolean> {
  if (!hasDatabaseUrl()) {
    return consumeGifQuota(1);
  }
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{
      gif_hour_window_start: Date | string;
      gif_requests_in_window: number;
    }>(
      `UPDATE scheduler_state
       SET
         gif_hour_window_start = CASE
           WHEN gif_hour_window_start IS NULL
             OR gif_hour_window_start <= NOW() - INTERVAL '1 hour'
           THEN NOW()
           ELSE gif_hour_window_start
         END,
         gif_requests_in_window = CASE
           WHEN gif_hour_window_start IS NULL
             OR gif_hour_window_start <= NOW() - INTERVAL '1 hour'
           THEN 1
           ELSE gif_requests_in_window + 1
         END,
         updated_at = NOW()
       WHERE id = 1
         AND (
           gif_hour_window_start IS NULL
           OR gif_hour_window_start <= NOW() - INTERVAL '1 hour'
           OR gif_requests_in_window < $1
         )
       RETURNING gif_hour_window_start, gif_requests_in_window`,
      [GIF_HOURLY_QUOTA_LIMIT]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.warn('[serverGifMatcher] Postgres quota increment failed, falling back cleanly:', err);
    return consumeGifQuota(1);
  }
}

/**
 * Locks remaining quota for the active 1-hour window whenever an upstream GIF provider
 * returns HTTP 429 so neither queue workers nor `/api/gif` keep retrying until reset.
 */
export async function markGifHourlyQuotaExhaustedServer(): Promise<void> {
  const now = Date.now();
  const mem = pruneQuotaWindow(now);
  while (mem.length < GIF_HOURLY_QUOTA_LIMIT) {
    mem.push(now);
  }

  if (!hasDatabaseUrl()) return;
  try {
    await ensureSchema();
    const pool = getPool();
    await pool.query(
      `UPDATE scheduler_state
       SET
         gif_hour_window_start = COALESCE(gif_hour_window_start, NOW()),
         gif_requests_in_window = $1,
         updated_at = NOW()
       WHERE id = 1`,
      [GIF_HOURLY_QUOTA_LIMIT]
    );
  } catch (err) {
    console.warn('[serverGifMatcher] Failed marking 429 quota lock in Postgres:', err);
  }
}

function extractVisualTokens(text?: string | null): string[] {
  if (!text) return [];
  const rawTokens = String(text)
    .toLowerCase()
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((w) => w.trim())
    .filter(
      (w) =>
        w.length >= 3 &&
        w.length <= 22 &&
        !ABSTRACT_VISUAL_STOPWORDS.has(w)
    );

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const token of rawTokens) {
    if (!seen.has(token)) {
      seen.add(token);
      unique.push(token);
    }
  }
  return unique;
}

/**
 * Builds a concise 2–3 word concrete English search query tailored for visual GIF discovery.
 */
export function buildSpecificGifQuery(input: GifMatchInput): string | null {
  const explicit = sanitizeVisualQuery(input.gifQuery) || sanitizeVisualQuery(input.visualQuery);
  if (explicit) {
    const words = explicit.split(' ').filter(Boolean);
    if (words.length >= 2 || (words.length === 1 && !GENERIC_SINGLE_QUERY_WORDS.has(words[0]))) {
      return words.slice(0, 3).join(' ');
    }
  }

  const titleTokens = extractVisualTokens(input.en?.title || input.titleEn || input.title);
  const summaryTokens = extractVisualTokens(input.en?.factText || input.summaryEn || input.factText);
  const slugTokens = extractVisualTokens(input.slug || input.en?.slug || input.id);

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const tok of [...titleTokens, ...summaryTokens, ...slugTokens]) {
    if (!seen.has(tok)) {
      seen.add(tok);
      merged.push(tok);
      if (merged.length >= 3) break;
    }
  }

  if (merged.length >= 2) {
    return sanitizeVisualQuery(merged.slice(0, 3).join(' '));
  }

  const catKey = String(input.category || '').trim().toLowerCase();
  const catFallback = CATEGORY_VISUAL_FALLBACKS[catKey] || 'science cosmos discovery';
  if (merged.length === 1) {
    const firstCatWord = catFallback.split(' ')[0];
    const combined =
      merged[0] === firstCatWord
        ? catFallback
        : `${merged[0]} ${firstCatWord}`;
    return sanitizeVisualQuery(combined);
  }

  return sanitizeVisualQuery(catFallback);
}

/**
 * Broader 1–2 word keyword + category fallback when a specific query yields no clean GIF.
 */
export function buildBroaderGifFallbackQuery(input: GifMatchInput, specificQuery?: string | null): string | null {
  const catKey = String(input.category || '').trim().toLowerCase();
  const catFallback = CATEGORY_VISUAL_FALLBACKS[catKey] || 'science cosmos';
  const catWords = catFallback.split(' ').filter(Boolean);

  const specificWords = String(specificQuery || '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !ABSTRACT_VISUAL_STOPWORDS.has(w));

  const titleWords = extractVisualTokens(input.en?.title || input.titleEn || input.title);
  const seed = specificWords[0] || titleWords[0] || catWords[0];
  if (!seed) return sanitizeVisualQuery(catWords.slice(0, 2).join(' '));

  const second =
    catWords.find((w) => w !== seed) ||
    specificWords.find((w) => w !== seed) ||
    titleWords.find((w) => w !== seed) ||
    'cosmos';

  const broader = sanitizeVisualQuery(`${seed} ${second}`);
  if (!broader) return sanitizeVisualQuery(catWords.slice(0, 2).join(' '));
  if (broader === sanitizeVisualQuery(specificQuery)) {
    return sanitizeVisualQuery(catWords.slice(0, 2).join(' '));
  }
  return broader;
}

const VOCAB_VISUAL_QUERY_OVERRIDES: Record<string, string> = {
  resilient: 'strong storm comeback',
  substantiate: 'detective evidence proof',
  ambiguous: 'foggy crossroads question',
  ephemeral: 'sunset fading light',
  ubiquitous: 'city crowd smartphone',
  mitigate: 'calm ocean shelter',
  lucid: 'crystal clear water',
  scrutinize: 'magnifying glass inspect',
  flourish: 'flower blooming timelapse',
  pragmatic: 'gears working tool',
  candor: 'honest open talk',
  tenacious: 'mountain climber summit',
  serendipity: 'sparkling lucky discovery',
  catalyst: 'spark chemical reaction',
  eloquent: 'public speaker stage',
  paradox: 'illusion mirror puzzle',
  altruistic: 'helping hand kindness',
  meticulous: 'watchmaker precision gears',
  perseverance: 'runner mountain finish',
  coherent: 'puzzle pieces connecting',
  versatile: 'swiss knife tool',
  plausible: 'chess strategy think',
  intricate: 'clockwork mechanism gears',
  inevitable: 'dominoes falling chain',
  empathy: 'warm hug comfort',
  immerse: 'deep ocean diving',
};

const VOCAB_META_STOPWORDS = new Set([
  'someone', 'something', 'person', 'people', 'thing', 'things', 'making',
  'showing', 'having', 'doing', 'being', 'able', 'manner', 'quality', 'state',
  'action', 'process', 'express', 'describes', 'related', 'meaning', 'word',
]);

/**
 * Synthesizes a concise 2–4 word concrete English visual search query for vocabulary GIF lookup
 * (never emits Turkish tokens).
 */
export function buildVocabularyGifQuery(card: {
  word: string;
  partOfSpeech?: string;
  definitionEn?: string;
  exampleEn?: string;
  gifQuery?: string;
}): string {
  const explicit = sanitizeVisualQuery(card.gifQuery);
  if (explicit && explicit.split(' ').length >= 2) {
    return explicit.split(' ').slice(0, 4).join(' ');
  }

  const wordKey = String(card.word || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z-]/g, '');
  if (wordKey && VOCAB_VISUAL_QUERY_OVERRIDES[wordKey]) {
    return VOCAB_VISUAL_QUERY_OVERRIDES[wordKey];
  }

  const contextTokens = [
    ...extractVisualTokens(card.definitionEn),
    ...extractVisualTokens(card.exampleEn),
  ].filter((tok) => !VOCAB_META_STOPWORDS.has(tok) && tok !== wordKey);

  const selected: string[] = [];
  const seen = new Set<string>();
  for (const tok of contextTokens) {
    if (!seen.has(tok)) {
      seen.add(tok);
      selected.push(tok);
      if (selected.length >= 3) break;
    }
  }

  if (selected.length >= 2) {
    const query = sanitizeVisualQuery(selected.join(' '));
    if (query) return query;
  }

  const cleanWord = sanitizeVisualQuery(wordKey);
  if (cleanWord && selected.length === 1) {
    const combined = sanitizeVisualQuery(`${cleanWord} ${selected[0]}`);
    if (combined) return combined;
  }

  if (cleanWord) {
    const modifier =
      card.partOfSpeech === 'fiil'
        ? 'motion action'
        : card.partOfSpeech === 'sıfat'
          ? 'vivid light'
          : 'concept spark';
    const combined = sanitizeVisualQuery(`${cleanWord} ${modifier}`);
    if (combined) return combined;
  }

  return 'light spark discovery';
}

export interface VocabGifMatchInput {
  id?: string;
  word: string;
  partOfSpeech?: string;
  definitionEn?: string;
  exampleEn?: string;
  gifQuery?: string | null;
  gifUrl?: string | null;
}

/**
 * Resolves a topic/concept GIF for a sanitized query inside the shared 90/hr quota guard.
 */
export async function resolveServerGifForQuery(
  gifQuery: string,
  options?: { category?: string; expectedTerms?: string[] }
) {
  const expectedTerms =
    options?.expectedTerms && options.expectedTerms.length > 0
      ? options.expectedTerms
      : gifQuery.split(' ').filter(Boolean);

  return searchTopicGif(gifQuery, {
    ...(options?.category ? { category: options.category } : {}),
    expectedTerms,
  });
}

function resolveSlugFromInput(input: GifMatchInput): string {
  return String(input.slug || input.en?.slug || input.id || '').trim().slice(0, 160);
}

function normalizeMatchInput(entry: GifMatchInput | FactCard | { fact: FactCard }): GifMatchInput {
  if ('fact' in entry && entry.fact && typeof entry.fact === 'object') {
    const f = entry.fact;
    return {
      slug: f.slug || f.en?.slug || f.id,
      id: f.id,
      category: f.category,
      visualQuery: f.visualQuery,
      gifQuery: f.gifQuery,
      gifUrl: f.gifUrl,
      titleEn: f.en?.title,
      summaryEn: f.en?.factText,
      en: f.en,
    };
  }
  return entry as GifMatchInput;
}

/**
 * Matches a clean, topic-relevant GIF for one fact card and permanently caches
 * `(gif_url, gif_query)` in Postgres. Never queries external GIF APIs if Postgres
 * or caller payload already holds a non-empty `gif_url`.
 */
export async function matchAndPersistFactGifServer(
  rawInput: GifMatchInput
): Promise<MatchFactGifResult> {
  const input = normalizeMatchInput(rawInput);
  const slug = resolveSlugFromInput(input);
  const existingInlineUrl = String(input.gifUrl || '').trim();
  const gifQuery = buildSpecificGifQuery(input) || '';

  if (existingInlineUrl && isRenderableGifImageUrl(existingInlineUrl)) {
    return {
      slug,
      gifUrl: existingInlineUrl,
      gifQuery: String(input.gifQuery || '').trim() || gifQuery,
      provider: 'postgres',
      persisted: true,
      cached: true,
      skippedReason: 'already_cached',
    };
  }

  if (slug && hasDatabaseUrl()) {
    const dbCachedUrl = await getFactGifUrlDb(slug);
    if (dbCachedUrl) {
      return {
        slug,
        gifUrl: dbCachedUrl,
        gifQuery: String(input.gifQuery || '').trim() || gifQuery,
        provider: 'postgres',
        persisted: true,
        cached: true,
        skippedReason: 'already_cached',
      };
    }
  }

  if (!hasConfiguredGifProviderKeys()) {
    return {
      slug,
      gifUrl: null,
      gifQuery,
      provider: 'none',
      persisted: false,
      skippedReason: 'no_api_key',
    };
  }

  if (!gifQuery) {
    return {
      slug,
      gifUrl: null,
      gifQuery: '',
      provider: 'none',
      persisted: false,
      skippedReason: 'invalid_query',
    };
  }

  const quotaNow = await getHourlyGifQuotaStatusServer();
  if (quotaNow.exhausted) {
    return {
      slug,
      gifUrl: null,
      gifQuery,
      provider: 'none',
      persisted: false,
      skippedReason: 'quota_exceeded',
    };
  }

  const expectedTerms = Array.from(
    new Set([
      ...gifQuery.split(' '),
      ...extractVisualTokens(input.en?.title || input.titleEn || input.title).slice(0, 4),
    ])
  );

  let searchResult = await resolveServerGifForQuery(gifQuery, {
    category: input.category ? String(input.category) : undefined,
    expectedTerms,
  });
  let effectiveQuery = gifQuery;

  if (!searchResult.gifUrl && !searchResult.quotaExhausted && !searchResult.rateLimited) {
    const broader = buildBroaderGifFallbackQuery(input, gifQuery);
    if (broader && broader !== gifQuery) {
      console.log(
        `[serverGifMatcher] No clean GIF for specific query="${gifQuery}"; retrying broader="${broader}" (slug=${slug || 'n/a'})`
      );
      const broaderResult = await resolveServerGifForQuery(broader, {
        category: input.category ? String(input.category) : undefined,
        expectedTerms: broader.split(' '),
      });
      // If still empty after filters, relax relevance once on the broader query.
      if (
        !broaderResult.gifUrl &&
        !broaderResult.quotaExhausted &&
        !broaderResult.rateLimited &&
        (broaderResult.dataLength ?? 0) > 0
      ) {
        console.log(
          `[serverGifMatcher] Broader query still filtered out; relaxing relevance for "${broader}"`
        );
        searchResult = await searchTopicGif(broader, {
          category: input.category ? String(input.category) : undefined,
          relaxRelevance: true,
          bypassCache: true,
        });
        effectiveQuery = broader;
      } else {
        searchResult = broaderResult;
        effectiveQuery = broader;
      }
    }
  }

  if (!searchResult.gifUrl) {
    if (slug && hasDatabaseUrl() && !searchResult.quotaExhausted && !searchResult.rateLimited) {
      await updateFactGifQueryOnlyDb(slug, effectiveQuery);
    }
    const upstreamError = Boolean(searchResult.upstreamError || searchResult.errorKind);
    return {
      slug,
      gifUrl: null,
      gifQuery: effectiveQuery,
      provider: 'none',
      persisted: false,
      cached: searchResult.cached,
      rateLimited: searchResult.rateLimited,
      emptyResult: searchResult.emptyResult ?? true,
      upstreamError,
      httpStatus: searchResult.httpStatus,
      skippedReason: searchResult.quotaExhausted
        ? 'quota_exceeded'
        : upstreamError
          ? 'upstream_error'
          : 'no_clean_match',
    };
  }

  let persisted = false;
  if (slug && hasDatabaseUrl()) {
    await updateFactGifUrlDb(slug, searchResult.gifUrl, effectiveQuery);
    persisted = true;
  }

  return {
    slug,
    gifUrl: searchResult.gifUrl,
    gifQuery: effectiveQuery,
    provider: searchResult.provider,
    persisted,
    cached: searchResult.cached,
    httpStatus: searchResult.httpStatus,
  };
}

/**
 * Matches and permanently caches a GIPHY visual GIF for one `vocabulary_cards` row
 * using the shared 90/hr Postgres quota ceiling.
 */
export async function matchAndPersistVocabularyGifServer(
  input: VocabGifMatchInput
): Promise<MatchFactGifResult> {
  const cleanWord = String(input.word || '').trim().slice(0, 120);
  const lookupKey = String(input.id || cleanWord).trim().slice(0, 160);
  const existingInlineUrl = String(input.gifUrl || '').trim();
  const gifQuery = buildVocabularyGifQuery({
    word: cleanWord,
    partOfSpeech: input.partOfSpeech,
    definitionEn: input.definitionEn,
    exampleEn: input.exampleEn,
    gifQuery: input.gifQuery || undefined,
  });

  if (existingInlineUrl && isRenderableGifImageUrl(existingInlineUrl)) {
    return {
      slug: lookupKey,
      gifUrl: existingInlineUrl,
      gifQuery: String(input.gifQuery || '').trim() || gifQuery,
      provider: 'postgres',
      persisted: true,
      cached: true,
      skippedReason: 'already_cached',
    };
  }

  if (lookupKey && hasDatabaseUrl()) {
    const dbCachedUrl = await getVocabularyGifUrlDb(lookupKey, cleanWord);
    if (dbCachedUrl) {
      return {
        slug: lookupKey,
        gifUrl: dbCachedUrl,
        gifQuery: String(input.gifQuery || '').trim() || gifQuery,
        provider: 'postgres',
        persisted: true,
        cached: true,
        skippedReason: 'already_cached',
      };
    }
  }

  if (!hasConfiguredGifProviderKeys()) {
    return {
      slug: lookupKey,
      gifUrl: null,
      gifQuery,
      provider: 'none',
      persisted: false,
      skippedReason: 'no_api_key',
    };
  }

  if (!gifQuery) {
    return {
      slug: lookupKey,
      gifUrl: null,
      gifQuery: '',
      provider: 'none',
      persisted: false,
      skippedReason: 'invalid_query',
    };
  }

  const quotaNow = await getHourlyGifQuotaStatusServer();
  if (quotaNow.exhausted) {
    return {
      slug: lookupKey,
      gifUrl: null,
      gifQuery,
      provider: 'none',
      persisted: false,
      skippedReason: 'quota_exceeded',
    };
  }

  const expectedTerms = Array.from(
    new Set([
      ...gifQuery.split(' '),
      ...extractVisualTokens(`${cleanWord} ${input.definitionEn || ''}`).slice(0, 4),
    ])
  );

  const searchResult = await resolveServerGifForQuery(gifQuery, { expectedTerms });
  if (!searchResult.gifUrl) {
    if (lookupKey && hasDatabaseUrl() && !searchResult.quotaExhausted && !searchResult.rateLimited) {
      await updateVocabularyGifQueryOnlyDb(lookupKey, gifQuery, cleanWord);
    }
    return {
      slug: lookupKey,
      gifUrl: null,
      gifQuery,
      provider: 'none',
      persisted: false,
      cached: searchResult.cached,
      rateLimited: searchResult.rateLimited,
      skippedReason: searchResult.quotaExhausted ? 'quota_exceeded' : 'no_clean_match',
    };
  }

  let persisted = false;
  if (lookupKey && hasDatabaseUrl()) {
    await updateVocabularyGifUrlDb(lookupKey, searchResult.gifUrl, gifQuery, cleanWord);
    persisted = true;
  }

  return {
    slug: lookupKey,
    gifUrl: searchResult.gifUrl,
    gifQuery,
    provider: searchResult.provider,
    persisted,
    cached: searchResult.cached,
  };
}

async function acquirePostgresGifMatchingLock(): Promise<boolean> {
  if (!hasDatabaseUrl()) return true;
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{ id: number }>(
      `UPDATE scheduler_state
       SET is_matching_gifs = TRUE,
           gif_lock_started_at = NOW(),
           updated_at = NOW()
       WHERE id = 1
         AND (
           is_matching_gifs = FALSE
           OR gif_lock_started_at IS NULL
           OR gif_lock_started_at <= NOW() - INTERVAL '10 minutes'
         )
       RETURNING id`
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.warn('[serverGifMatcher] Failed to acquire Postgres GIF matching lock:', err);
    return false;
  }
}

async function releasePostgresGifMatchingLock(): Promise<void> {
  if (!hasDatabaseUrl()) return;
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE scheduler_state
       SET is_matching_gifs = FALSE,
           gif_lock_started_at = NULL,
           updated_at = NOW()
       WHERE id = 1`
    );
  } catch (err) {
    console.warn('[serverGifMatcher] Failed releasing Postgres GIF matching lock:', err);
  }
}

async function queryMissingGifRowsFromPostgres(limit: number): Promise<GifMatchInput[]> {
  if (!hasDatabaseUrl()) return [];
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{
      slug: string;
      category: string;
      title_en: string | null;
      title_tr: string | null;
      summary_en: string | null;
      visual_query: string | null;
      gif_query: string | null;
      gif_url: string | null;
    }>(
      `SELECT slug, category, title_en, title_tr, summary_en, visual_query, gif_query, gif_url
       FROM facts
       WHERE gif_url IS NULL OR TRIM(gif_url) = ''
       ORDER BY CASE WHEN gif_query IS NULL OR TRIM(gif_query) = '' THEN 0 ELSE 1 END ASC,
                created_at DESC,
                id DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((row) => ({
      slug: row.slug,
      category: row.category,
      titleEn: row.title_en,
      title: row.title_tr,
      summaryEn: row.summary_en,
      visualQuery: row.visual_query,
      gifQuery: row.gif_query,
      gifUrl: row.gif_url,
    }));
  } catch (err) {
    console.warn('[serverGifMatcher] Postgres missing GIF query skipped:', err);
    return [];
  }
}

async function queryMissingVocabRowsFromPostgres(limit: number): Promise<VocabGifMatchInput[]> {
  if (!hasDatabaseUrl() || limit <= 0) return [];
  try {
    await ensureSchema();
    const pool = getPool();
    const res = await pool.query<{
      id: string;
      word: string;
      part_of_speech: string | null;
      definition_en: string | null;
      example_en: string | null;
      gif_query: string | null;
      gif_url: string | null;
    }>(
      `SELECT id, word, part_of_speech, definition_en, example_en, gif_query, gif_url
       FROM vocabulary_cards
       WHERE gif_url IS NULL OR TRIM(gif_url) = ''
       ORDER BY CASE WHEN gif_query IS NULL OR TRIM(gif_query) = '' THEN 0 ELSE 1 END ASC,
                created_at DESC,
                word ASC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((row) => ({
      id: row.id,
      word: row.word,
      partOfSpeech: row.part_of_speech || undefined,
      definitionEn: row.definition_en || undefined,
      exampleEn: row.example_en || undefined,
      gifQuery: row.gif_query,
      gifUrl: row.gif_url,
    }));
  } catch (err) {
    console.warn('[serverGifMatcher] Postgres missing vocabulary GIF query skipped:', err);
    return [];
  }
}

/**
 * Postgres-locked GIF queue worker that selects up to remaining hourly quota missing-GIF
 * `facts` AND `vocabulary_cards` (prioritizing empty `gif_query` first, then newest `created_at`)
 * and populates permanent HTTPS image URLs strictly under the 90 req/hr limit.
 */
export async function backfillMissingFactGifsServer(
  options?: BackfillGifOptions
): Promise<BackfillGifResult> {
  if (globalThis.__scrollyGifBackfillInFlight) {
    return globalThis.__scrollyGifBackfillInFlight;
  }

  const run = (async (): Promise<BackfillGifResult> => {
    const quotaBefore = await getHourlyGifQuotaStatusServer();

    if (!hasConfiguredGifProviderKeys()) {
      return {
        attempted: 0,
        matched: 0,
        persisted: 0,
        quotaStatus: quotaBefore,
        skippedReason: 'no_api_key',
      };
    }

    if (!options?.allowMemoryOnly && !hasDatabaseUrl()) {
      return {
        attempted: 0,
        matched: 0,
        persisted: 0,
        quotaStatus: quotaBefore,
        skippedReason: 'no_database',
      };
    }

    const minRemaining = Math.max(0, options?.minRemainingQuota ?? 0);
    if (quotaBefore.remaining <= minRemaining) {
      return {
        attempted: 0,
        matched: 0,
        persisted: 0,
        quotaStatus: quotaBefore,
        skippedReason: 'quota_guard',
      };
    }

    const acquiredLock = options?.allowMemoryOnly && !hasDatabaseUrl()
      ? true
      : await acquirePostgresGifMatchingLock();
    if (!acquiredLock) {
      return {
        attempted: 0,
        matched: 0,
        persisted: 0,
        quotaStatus: quotaBefore,
        skippedReason: 'lock_busy',
      };
    }

    try {
      const budget = Math.max(1, quotaBefore.remaining - minRemaining);
      const requestedCap = Math.max(
        1,
        Math.floor(options?.maxPerRun ?? GIF_BACKFILL_MAX_ATTEMPTS_PER_RUN)
      );
      // Hard ceiling 15 so a bad key/filter cannot burn the full 90/hr quota in one loop.
      const maxPerRun = Math.min(15, requestedCap, GIF_HOURLY_QUOTA_LIMIT, budget);

      console.info(
        `[serverGifMatcher] GIF backfill start: maxPerRun=${maxPerRun} quotaRemaining=${quotaBefore.remaining}/${quotaBefore.limit} gapMs=${GIF_REQUEST_GAP_MS} circuitBreaker=${GIF_CIRCUIT_BREAKER_THRESHOLD}`
      );

      const rawCandidates = options?.entries
        ? options.entries.map(normalizeMatchInput)
        : await queryMissingGifRowsFromPostgres(maxPerRun);

      const seenSlugs = new Set<string>();
      const missingCandidates: GifMatchInput[] = [];
      for (const item of rawCandidates) {
        const slug = resolveSlugFromInput(item);
        if (!slug || seenSlugs.has(slug)) continue;
        if (item.gifUrl && String(item.gifUrl).trim().length > 0) continue;
        seenSlugs.add(slug);
        missingCandidates.push(item);
        if (missingCandidates.length >= maxPerRun) break;
      }

      let attempted = 0;
      let matched = 0;
      let persisted = 0;
      let rateLimited = false;
      let hitQuotaCeiling = false;
      let circuitOpen = false;
      let consecutiveMisses = 0;

      for (const candidate of missingCandidates) {
        const statusNow = await getHourlyGifQuotaStatusServer();
        if (statusNow.remaining <= minRemaining || statusNow.exhausted) {
          hitQuotaCeiling = true;
          break;
        }

        if (attempted > 0) {
          await sleep(GIF_REQUEST_GAP_MS);
        }

        attempted += 1;
        const result = await matchAndPersistFactGifServer(candidate);
        if (result.gifUrl) {
          matched += 1;
          consecutiveMisses = 0;
          if (result.persisted) persisted += 1;
        } else if (result.rateLimited) {
          rateLimited = true;
          consecutiveMisses += 1;
          console.error(
            `[serverGifMatcher] Rate limited during backfill (slug=${result.slug} status=${result.httpStatus ?? 'n/a'}); opening circuit`
          );
          circuitOpen = true;
          break;
        } else if (result.skippedReason === 'quota_exceeded') {
          hitQuotaCeiling = true;
          break;
        } else {
          consecutiveMisses += 1;
          console.log(
            `[serverGifMatcher] Miss ${consecutiveMisses}/${GIF_CIRCUIT_BREAKER_THRESHOLD}` +
              ` slug=${result.slug} reason=${result.skippedReason || 'unknown'}` +
              ` status=${result.httpStatus ?? 'n/a'} upstreamError=${Boolean(result.upstreamError)}`
          );
          if (consecutiveMisses >= GIF_CIRCUIT_BREAKER_THRESHOLD) {
            circuitOpen = true;
            console.error(
              `[serverGifMatcher] Circuit breaker OPEN after ${consecutiveMisses} consecutive Giphy errors/empty results — stopping to protect hourly quota`
            );
            break;
          }
        }
      }

      if (
        !options?.entries &&
        !rateLimited &&
        !hitQuotaCeiling &&
        !circuitOpen &&
        hasDatabaseUrl()
      ) {
        const statusBeforeVocab = await getHourlyGifQuotaStatusServer();
        const remainingSlots = Math.min(
          maxPerRun - attempted,
          Math.max(0, statusBeforeVocab.remaining - minRemaining)
        );
        if (remainingSlots > 0 && !statusBeforeVocab.exhausted) {
          const vocabRows = await queryMissingVocabRowsFromPostgres(remainingSlots);
          for (const vocab of vocabRows) {
            const statusNow = await getHourlyGifQuotaStatusServer();
            if (statusNow.remaining <= minRemaining || statusNow.exhausted) {
              break;
            }
            if (attempted > 0) {
              await sleep(GIF_REQUEST_GAP_MS);
            }
            attempted += 1;
            const vocabResult = await matchAndPersistVocabularyGifServer(vocab);
            if (vocabResult.gifUrl) {
              matched += 1;
              consecutiveMisses = 0;
              if (vocabResult.persisted) persisted += 1;
            } else if (vocabResult.rateLimited) {
              rateLimited = true;
              circuitOpen = true;
              break;
            } else if (vocabResult.skippedReason === 'quota_exceeded') {
              break;
            } else {
              consecutiveMisses += 1;
              if (consecutiveMisses >= GIF_CIRCUIT_BREAKER_THRESHOLD) {
                circuitOpen = true;
                console.error(
                  `[serverGifMatcher] Circuit breaker OPEN on vocab backfill after ${consecutiveMisses} consecutive misses`
                );
                break;
              }
            }
          }
        }
      }

      if (attempted > 0 || rateLimited || circuitOpen) {
        const endQuota = await getHourlyGifQuotaStatusServer();
        console.info(
          `[serverGifMatcher] GIF backfill done: attempted=${attempted} matched=${matched} persisted=${persisted} quotaUsed=${endQuota.used}/${endQuota.limit}` +
            `${rateLimited ? ' (rateLimited)' : ''}${circuitOpen ? ' (circuitOpen)' : ''}`
        );
      }

      return {
        attempted,
        matched,
        persisted,
        quotaStatus: await getHourlyGifQuotaStatusServer(),
        ...(rateLimited ? { rateLimited: true } : {}),
        ...(circuitOpen ? { skippedReason: 'circuit_open' } : {}),
      };
    } finally {
      if (!(options?.allowMemoryOnly && !hasDatabaseUrl())) {
        await releasePostgresGifMatchingLock();
      }
    }
  })().finally(() => {
    globalThis.__scrollyGifBackfillInFlight = undefined;
  });

  globalThis.__scrollyGifBackfillInFlight = run;
  return run;
}

/**
 * Throttled, non-blocking backfill trigger for callers wanting direct GIF queue execution.
 */
export function scheduleMissingFactGifsBackfill(
  entries?: Array<GifMatchInput | FactCard | { fact: FactCard }>
): boolean {
  if (!hasDatabaseUrl() || !hasConfiguredGifProviderKeys()) {
    return false;
  }
  if (globalThis.__scrollyGifBackfillInFlight) {
    return false;
  }

  const now = Date.now();
  const lastRunAt = globalThis.__scrollyGifBackfillLastRunAt ?? 0;
  if (now - lastRunAt < BACKFILL_THROTTLE_MS) {
    return false;
  }

  const normalized = entries ? entries.map(normalizeMatchInput) : null;
  const missing = normalized
    ? normalized.filter(
        (item) => resolveSlugFromInput(item).length > 0 && !(item.gifUrl && String(item.gifUrl).trim())
      )
    : null;
  if (missing && missing.length === 0) {
    return false;
  }

  globalThis.__scrollyGifBackfillLastRunAt = now;

  queueMicrotask(() => {
    void backfillMissingFactGifsServer({
      maxPerRun: GIF_BACKFILL_MAX_ATTEMPTS_PER_RUN,
      ...(missing ? { entries: missing } : {}),
    }).catch((err) => {
      console.warn('[serverGifMatcher] Scheduled backfill error ignored:', err);
    });
  });

  return true;
}
